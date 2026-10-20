import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin-middleware";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function assertSafeAttachmentPath(ticketId: string, storagePath: string) {
  // The client may generate the UUID portion, but it may not choose a
  // different ticket, absolute path, traversal segment, or nested path.
  const prefix = `${ticketId}/`;
  if (!storagePath.startsWith(prefix)) {
    throw new Error("Invalid attachment storage path");
  }

  const remainder = storagePath.slice(prefix.length);
  if (
    !remainder ||
    remainder.includes("/") ||
    remainder.includes("\\") ||
    remainder.includes("..") ||
    remainder.length > 450
  ) {
    throw new Error("Invalid attachment storage path");
  }
}

function assertValidAttachmentMetadata(
  mimeType: string,
  sizeBytes: number,
  fileName: string,
) {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase())) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB");
  }

  if (
    !fileName ||
    fileName.length > 255 ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0")
  ) {
    throw new Error("Invalid attachment filename");
  }
}

async function notifyUser(
  subject: string,
  html: string,
  recipient: string,
) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from || !recipient) {
      console.error(
        "[notifyUser] RESEND_API_KEY, RESEND_FROM_EMAIL, or recipient is missing — skipping user email",
      );
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[notifyUser] Resend API error", res.status, txt);
    }
  } catch (err) {
    console.error("[notifyUser] Failed to send user notification email:", err);
  }
}

// NEW: Admin email notification — reusable helper via Resend's REST API.
// This must NEVER cause a ticket/enquiry submission to fail — every
// failure mode here (missing config, network error, non-2xx from Resend)
// is caught and only logged server-side, never thrown back to the caller.
async function notifyAdmin(subject: string, html: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!apiKey || !adminEmail) {
      console.error(
        "[notifyAdmin] RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not configured — skipping admin email",
      );
      return;
    }

    // TODO: configure your verified Resend sender identity here, e.g.
    // "SIDDHBALI TECHNOLOGIES <notifications@yourdomain.com>". The domain
    // in this address must be verified in your Resend account (SPF/DKIM)
    // for production sending — see the setup notes provided alongside
    // this code. Left unset intentionally; do not guess a domain.
    const from = "onboarding@resend.dev";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [adminEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[notifyAdmin] Resend API error", res.status, txt);
    }
  } catch (err) {
    console.error("[notifyAdmin] Failed to send admin notification email:", err);
  }
}
// END NEW: Admin email notification helper

const TicketTypeEnum = z.enum(["contact", "career", "enquiry"]);
const AllTicketTypeEnum = z.enum(["contact", "career", "enquiry", "it_support"]);
const StatusEnum = z.enum([
  "open",
  "in_progress",
  "waiting_on_user",
  "resolved",
  "closed",
]);
const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);

// Authenticated IT support ticket submission. Only an authenticated
// Supabase user may create an it_support ticket, and submitted_by is always
// taken from the verified session — never from client input.
const SubmitSchema = z.object({
  type: z.literal("it_support"),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(5000),
  contact_name: z.string().trim().min(1).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  details: z.record(z.string(), z.any()).optional(),
});

export const submitTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => SubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tickets")
      .insert({
        type: data.type,
        subject: data.subject,
        message: data.message,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        company: data.company || null,
        details: data.details ?? {},
        submitted_by: context.userId,
      } as never)
      .select("id, ticket_number, status, created_at")
      .single();
    if (error) throw new Error(error.message);

    return row;
  });

const EnquiryTypeEnum = z.enum(["contact", "business", "call_back", "career"]);

// Public enquiry submission (Contact page, Careers/Apply page, Request a
// Call). Writes to public.enquiries, never public.tickets — enquiries have
// no authenticated-owner concept, so there is no auth middleware here and
// no submitted_by column to populate. Guests and logged-in users can both
// call this.
const SubmitEnquirySchema = z.object({
  type: EnquiryTypeEnum,
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(5000),
  contact_name: z.string().trim().min(1).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  details: z.record(z.string(), z.any()).optional(),
});

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator((input) => SubmitEnquirySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("enquiries" as never)
      .insert({
        type: data.type,
        subject: data.subject,
        message: data.message,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        company: data.company || null,
        details: data.details ?? {},
      } as never)
      .select("id, enquiry_number, status, created_at")
      .single();
    if (error) throw new Error(error.message);

    // NEW: Admin email notification
    await notifyAdmin(
      `New Enquiry — ${(row as any).enquiry_number}`,
      `
        <h2>New Enquiry</h2>
        <p><strong>Enquiry #:</strong> ${(row as any).enquiry_number}</p>
        <p><strong>Name:</strong> ${escapeHtml(data.contact_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.contact_email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
        <p><strong>Type:</strong> ${escapeHtml(data.type)}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(data.message)}</p>
        <p><strong>Created:</strong> ${(row as any).created_at}</p>
      `,
    );
    // END NEW

    return row as unknown as {
      id: string;
      enquiry_number: string;
      status: string;
      created_at: string;
    };
  });

const TrackSchema = z.object({
  ticket_number: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(200),
});

export const trackTicket = createServerFn({ method: "POST" })
  .validator((input) => TrackSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select(
        "id, ticket_number, type, status, priority, subject, message, contact_name, contact_email, company, created_at, updated_at, resolved_at",
      )
      .eq("ticket_number", data.ticket_number.toUpperCase())
      .ilike("contact_email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("No ticket found with that number and email");
    const { data: comments } = await supabaseAdmin
      .from("ticket_comments")
      .select("id, author_name, body, is_admin, created_at")
      .eq("ticket_id", ticket.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    // Attachments are only ever exposed on this public, unauthenticated
    // page when they are either attached directly to the ticket
    // (comment_id is null) or attached to one of the already-fetched,
    // already-filtered non-internal comments above. Attachments on
    // internal admin-only notes must never be signed or returned here —
    // this uses supabaseAdmin (service role) which bypasses RLS, so this
    // filtering is the only thing protecting internal attachments on this
    // route, and must never be skipped.
    const visibleCommentIds = new Set((comments ?? []).map((c) => c.id));
    const { data: attachmentsRaw } = await supabaseAdmin
      .from("ticket_attachments" as never)
      .select(
        "id, comment_id, file_name, mime_type, size_bytes, storage_path, created_at",
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    const attachmentRows = (attachmentsRaw ?? []) as unknown as Array<{
      id: string;
      comment_id: string | null;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      storage_path: string;
      created_at: string;
    }>;

    const publicAttachmentRows = attachmentRows.filter(
      (a) => a.comment_id === null || visibleCommentIds.has(a.comment_id),
    );

    // Short-lived signed URLs only — the ticket-attachments bucket is
    // private, so a public URL is never generated or exposed.
    const attachments = await Promise.all(
      publicAttachmentRows.map(async (a) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("ticket-attachments")
          .createSignedUrl(a.storage_path, 300);
        return {
          id: a.id,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          created_at: a.created_at,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    return { ticket, comments: comments ?? [], attachments };
  });

export const getMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select(
        "id, ticket_number, type, status, priority, subject, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTicketDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Not found");
    const { data: comments } = await context.supabase
      .from("ticket_comments")
      .select(
        "id, author_id, author_name, body, is_internal, is_admin, created_at",
      )
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    const { data: history } = await context.supabase
      .from("ticket_status_history")
      .select(
        "id, from_status, to_status, from_assigned, to_assigned, changed_by, created_at",
      )
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });

    // Attachments — this query runs through context.supabase (the
    // caller's own authenticated session), so the existing RLS policies
    // on public.ticket_attachments already restrict which rows come back
    // (ticket owner or admin only, and internal-comment attachments
    // visible to admins only). No additional manual filtering is needed
    // here the way it is for the public, service-role trackTicket route.
    const { data: attachmentsRaw } = await context.supabase
      .from("ticket_attachments" as never)
      .select(
        "id, comment_id, file_name, mime_type, size_bytes, storage_path, uploaded_by, created_at",
      )
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });

    const attachmentRows = (attachmentsRaw ?? []) as unknown as Array<{
      id: string;
      comment_id: string | null;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      storage_path: string;
      uploaded_by: string;
      created_at: string;
    }>;

    // Short-lived signed URLs only — the ticket-attachments bucket is
    // private, so a public URL is never generated or exposed.
    const attachments = await Promise.all(
      attachmentRows.map(async (a) => {
        const { data: signed } = await context.supabase.storage
          .from("ticket-attachments")
          .createSignedUrl(a.storage_path, 300);
        return {
          id: a.id,
          comment_id: a.comment_id,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          uploaded_by: a.uploaded_by,
          created_at: a.created_at,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    // Assigned admin's name/email — a non-admin caller's own session cannot
    // read another user's `profiles` row directly (RLS on `profiles` only
    // allows auth.uid() = id OR admin). However, the ticket row above was
    // only returned because RLS on `tickets` already confirmed this caller
    // owns this ticket or is an admin, so it is safe to use the service
    // role here to fetch *only* that single assigned admin's public name/
    // email for this already-authorized ticket (same pattern already used
    // by trackTicket for public, service-role reads).
    //
    // Defensive guard: `tickets.assigned_to` is a UUID column, so under
    // normal operation it can only ever be null or a valid UUID. This check
    // (plus try/catch) exists purely so that any anomalous value never
    // throws a raw, unhandled Postgres error and crashes the whole ticket
    // detail page — it simply falls back to "no assigned admin" instead.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let assignedAdmin: { id: string; full_name: string | null; email: string } | null =
      null;
    if (
      typeof ticket.assigned_to === "string" &&
      UUID_RE.test(ticket.assigned_to)
    ) {
      try {
        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");
        const { data: adminProfile, error: adminProfileError } =
          await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", ticket.assigned_to)
            .maybeSingle();
        if (!adminProfileError) {
          assignedAdmin = adminProfile ?? null;
        }
      } catch {
        assignedAdmin = null;
      }
    }

    return {
      ticket,
      comments: comments ?? [],
      history: history ?? [],
      attachments,
      assignedAdmin,
    };
  });

const CommentSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().optional().default(false),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => CommentSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Get author name + check admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const is_admin = !!roleRow;
    if (data.is_internal && !is_admin)
      throw new Error("Only admins can post internal notes");
    const { data: comment, error } = await context.supabase
      .from("ticket_comments")
      .insert({
        ticket_id: data.ticket_id,
        author_id: context.userId,
        author_name: profile?.full_name || profile?.email || "User",
        body: data.body,
        is_internal: data.is_internal ?? false,
        is_admin,
      })
      .select(
        "id, ticket_id, author_id, author_name, body, is_internal, is_admin, created_at",
      )
      .single();
    if (error) throw new Error(error.message);

    // Only notify the user when an admin posts a user-visible reply.
    // Internal notes must never be sent to the ticket owner.
    if (is_admin && !comment.is_internal) {
      const { data: ticket } = await context.supabase
        .from("tickets")
        .select("ticket_number, subject, contact_email")
        .eq("id", data.ticket_id)
        .maybeSingle();

      if (ticket?.contact_email) {
        await notifyUser(
          `Ticket ${ticket.ticket_number} — Admin replied`,
          `
            <h2>New reply on your support ticket</h2>
            <p><strong>Ticket #:</strong> ${escapeHtml(ticket.ticket_number)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
            <p><strong>Reply:</strong><br/>${escapeHtml(comment.body)}</p>
          `,
          ticket.contact_email,
        );
      }
    }

    return comment;
  });

// Records metadata for a file that has already been uploaded directly to
// the private `ticket-attachments` Storage bucket by the client (this
// function never receives file bytes — only the resulting storage path
// and metadata). Requires an authenticated session; ownership/authorization
// is verified server-side below, never trusted from client input, mirroring
// the same pattern already used by addComment.
const AttachFileSchema = z.object({
  ticket_id: z.string().uuid(),
  comment_id: z.string().uuid().optional(),
  storage_path: z.string().trim().min(1).max(500),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().min(1).max(100),
  size_bytes: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
});

export const attachTicketFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => AttachFileSchema.parse(input))
  .handler(async ({ data, context }) => {
    assertSafeAttachmentPath(data.ticket_id, data.storage_path);
    assertValidAttachmentMetadata(
      data.mime_type,
      data.size_bytes,
      data.file_name,
    );

    // Verify the ticket exists and that the caller owns it or is an admin.
    const { data: ticket, error: ticketError } = await context.supabase
      .from("tickets")
      .select("id, submitted_by")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (ticketError) throw new Error(ticketError.message);
    if (!ticket) throw new Error("Ticket not found");

    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const is_admin = !!roleRow;

    if (ticket.submitted_by !== context.userId && !is_admin) {
      throw new Error("You do not have access to this ticket");
    }

    // If this attachment is being added to a specific reply/comment
    // (rather than directly to the ticket at creation time), verify that
    // comment actually belongs to this same ticket, and prevent a normal
    // (non-admin) user from attaching a file to an internal admin-only
    // note — same rule already enforced by addComment for the note text
    // itself.
    if (data.comment_id) {
      const { data: comment, error: commentError } = await context.supabase
        .from("ticket_comments")
        .select("id, ticket_id, is_internal")
        .eq("id", data.comment_id)
        .maybeSingle();
      if (commentError) throw new Error(commentError.message);
      if (!comment || comment.ticket_id !== data.ticket_id) {
        throw new Error("Comment does not belong to this ticket");
      }
      if (comment.is_internal && !is_admin) {
        throw new Error("You cannot attach files to an internal note");
      }
    }

    const { data: row, error } = await context.supabase
      .from("ticket_attachments" as never)
      .insert({
        ticket_id: data.ticket_id,
        comment_id: data.comment_id ?? null,
        uploaded_by: context.userId,
        storage_path: data.storage_path,
        file_name: data.file_name,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
      } as never)
      .select(
        "id, ticket_id, comment_id, file_name, mime_type, size_bytes, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as {
      id: string;
      ticket_id: string;
      comment_id: string | null;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      created_at: string;
    };
  });

// ---------- ADMIN ----------

const ListSchema = z
  .object({
    status: StatusEnum.optional(),
    type: AllTicketTypeEnum.optional(),
    priority: PriorityEnum.optional(),
    q: z.string().trim().max(100).optional(),
  })
  .optional();

export const listAdminTickets = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input) => ListSchema.parse(input) ?? {})
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("tickets")
      .select(
        "id, ticket_number, type, status, priority, subject, contact_name, contact_email, assigned_to, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data?.status) query = query.eq("status", data.status);
    if (data?.type) query = query.eq("type", data.type);
    if (data?.priority) query = query.eq("priority", data.priority);
    if (data?.q)
      query = query.or(
        `subject.ilike.%${data.q}%,ticket_number.ilike.%${data.q}%,contact_email.ilike.%${data.q}%`,
      );
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: StatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    // .update().eq() can match zero rows (wrong/stale id, RLS filtering the
    // row out, a race with another change) and Supabase/PostgREST does NOT
    // report that as an `error` — it silently succeeds with nothing
    // changed. Requesting the updated row back and checking it was
    // actually returned turns that silent no-op into a real, visible
    // error instead of a false "Assigned" toast with no underlying change.
    const { data: updated, error } = await context.supabase
      .from("tickets")
      .update(patch as never)
      .eq("id", data.id)
      .select("id, assigned_to")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) {
      throw new Error(
        "Ticket was not updated — it may not exist, or you may not have permission to modify it.",
      );
    }
    return { ok: true, assigned_to: updated.assigned_to };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    // TEMP DEBUG — remove after root cause is found. No secrets logged.
    console.log("[listAdmins] user_roles:", JSON.stringify(roleRows));
    if (!roleRows?.length) return [];
    const ids = roleRows.map((r) => r.user_id);
    // TEMP DEBUG — remove after root cause is found. No secrets logged.
    console.log("[listAdmins] admin ids:", JSON.stringify(ids));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    // TEMP DEBUG — remove after root cause is found. No secrets logged.
    console.log("[listAdmins] profiles:", JSON.stringify(profiles));
    return profiles ?? [];
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select("status, type");
    if (error) throw new Error(error.message);
    const stats = {
      total: data?.length ?? 0,
      open: 0,
      in_progress: 0,
      waiting_on_user: 0,
      resolved: 0,
      closed: 0,
      contact: 0,
      career: 0,
      enquiry: 0,
      it_support: 0,
    } as Record<string, number>;
    for (const r of data ?? []) {
      stats[r.status] = (stats[r.status] ?? 0) + 1;
      stats[r.type] = (stats[r.type] ?? 0) + 1;
    }
    return stats;
  });