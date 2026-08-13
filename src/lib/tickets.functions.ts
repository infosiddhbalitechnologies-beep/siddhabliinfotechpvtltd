import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin-middleware";

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
  .from("enquiries")
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
return row;

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
return { ticket, comments: comments ?? [] };
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
return { ticket, comments: comments ?? [], history: history ?? [] };
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
const { error } = await context.supabase.from("ticket_comments").insert({
ticket_id: data.ticket_id,
author_id: context.userId,
author_name: profile?.full_name || profile?.email || "User",
body: data.body,
is_internal: data.is_internal ?? false,
is_admin,
});
if (error) throw new Error(error.message);
return { ok: true };
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
subject.ilike.%${data.q}%,ticket_number.ilike.%${data.q}%,contact_email.ilike.%${data.q}%,
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
const { error } = await context.supabase
.from("tickets")
.update(patch as never)
.eq("id", data.id);
if (error) throw new Error(error.message);
return { ok: true };
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
if (!roleRows?.length) return [];
const ids = roleRows.map((r) => r.user_id);
const { data: profiles } = await supabaseAdmin
.from("profiles")
.select("id, email, full_name")
.in("id", ids);
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