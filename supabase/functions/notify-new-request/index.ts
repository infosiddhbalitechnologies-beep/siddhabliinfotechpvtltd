// Supabase Edge Function: notify-new-request
// Triggered (via a DB trigger + pg_net, see the accompanying migration) on
// every INSERT into public.tickets or public.enquiries. Sends a
// notification email to the shared admin inbox through Resend, with
// clearly separate content for tickets vs enquiries.
//
// Required secrets (set with `supabase secrets set`):
//   RESEND_API_KEY        - your Resend API key
//   ADMIN_NOTIFY_EMAIL     - shared admin inbox to notify
//   RESEND_FROM_EMAIL      - a verified sender address/domain in Resend
//   NOTIFY_WEBHOOK_SECRET  - shared secret checked against the trigger's
//                            request so this function can't be called by
//                            anyone who finds the URL

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_NOTIFY_EMAIL = Deno.env.get("ADMIN_NOTIFY_EMAIL");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
const NOTIFY_WEBHOOK_SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET");

type TicketRecord = {
  id: string;
  ticket_number: string;
  type: string;
  subject: string;
  message: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company?: string | null;
  priority?: string;
  status?: string;
  submitted_by?: string | null;
  created_at: string;
};

type EnquiryRecord = {
  id: string;
  enquiry_number: string;
  type: string;
  subject: string;
  message: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company?: string | null;
  status?: string;
  created_at: string;
};

type NotifyPayload =
  | { source: "tickets"; record: TicketRecord }
  | { source: "enquiries"; record: EnquiryRecord };

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Ticket notifications (IT Support) — separate template from enquiries.
function buildTicketEmail(record: TicketRecord) {
  const subject = `New IT Support Ticket: ${record.ticket_number} — ${record.subject}`;
  const html = `
    <h2>New IT Support Ticket</h2>
    <p><strong>Ticket Number:</strong> ${escapeHtml(record.ticket_number)}</p>
    <p><strong>Priority:</strong> ${escapeHtml(record.priority ?? "normal")}</p>
    <p><strong>Status:</strong> ${escapeHtml(record.status ?? "open")}</p>
    <p><strong>Subject:</strong> ${escapeHtml(record.subject)}</p>
    <p><strong>Submitted by (authenticated user):</strong> ${escapeHtml(record.contact_name)} (${escapeHtml(record.contact_email)})</p>
    ${record.contact_phone ? `<p><strong>Phone:</strong> ${escapeHtml(record.contact_phone)}</p>` : ""}
    ${record.company ? `<p><strong>Company:</strong> ${escapeHtml(record.company)}</p>` : ""}
    <p><strong>Issue:</strong></p>
    <p>${escapeHtml(record.message).replace(/\n/g, "<br/>")}</p>
    <p><small>Received: ${escapeHtml(record.created_at)}</small></p>
  `;
  return { subject, html };
}

// Enquiry notifications (Contact / Business / Call-back / Career) —
// separate template from tickets.
function buildEnquiryEmail(record: EnquiryRecord) {
  const typeLabel: Record<string, string> = {
    contact: "Contact Message",
    business: "Business Enquiry",
    call_back: "Call-Back Request",
    career: "Career Application",
  };
  const label = typeLabel[record.type] ?? "Enquiry";

  const subject = `New ${label}: ${record.enquiry_number} — ${record.subject}`;
  const html = `
    <h2>New ${escapeHtml(label)}</h2>
    <p><strong>Enquiry Number:</strong> ${escapeHtml(record.enquiry_number)}</p>
    <p><strong>Type:</strong> ${escapeHtml(record.type)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(record.subject)}</p>
    <p><strong>From:</strong> ${escapeHtml(record.contact_name)} (${escapeHtml(record.contact_email)})</p>
    ${record.contact_phone ? `<p><strong>Phone:</strong> ${escapeHtml(record.contact_phone)}</p>` : ""}
    ${record.company ? `<p><strong>Company:</strong> ${escapeHtml(record.company)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(record.message).replace(/\n/g, "<br/>")}</p>
    <p><small>Received: ${escapeHtml(record.created_at)}</small></p>
  `;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify the shared secret so only our own DB trigger can call this.
  const incomingSecret = req.headers.get("x-notify-secret");
  if (!NOTIFY_WEBHOOK_SECRET || incomingSecret !== NOTIFY_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!RESEND_API_KEY || !ADMIN_NOTIFY_EMAIL || !RESEND_FROM_EMAIL) {
    console.error(
      "Missing RESEND_API_KEY / ADMIN_NOTIFY_EMAIL / RESEND_FROM_EMAIL",
    );
    return new Response("Server not configured", { status: 500 });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!payload || (payload.source !== "tickets" && payload.source !== "enquiries")) {
    return new Response("Invalid payload: unknown source", { status: 400 });
  }

  const { subject, html } =
    payload.source === "tickets"
      ? buildTicketEmail(payload.record)
      : buildEnquiryEmail(payload.record);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [ADMIN_NOTIFY_EMAIL],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend send failed:", res.status, errText);
    return new Response(`Resend error: ${errText}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});