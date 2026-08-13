import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "track_ticket",
  title: "Track a ticket",
  description:
    "Look up an SIDDHBALI ticket by its ticket number and the submitter's email. Returns the ticket status, subject, and any public reply thread. Matches the public /track flow — the caller must know both the ticket number and the email that submitted it.",
  inputSchema: {
    ticket_number: z
      .string()
      .min(3)
      .max(50)
      .describe("Ticket number, e.g. SIDDH-2026-000123."),
    email: z
      .string()
      .email()
      .max(200)
      .describe("Email address the ticket was submitted with."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ ticket_number, email }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        content: [{ type: "text", text: "Ticket service is not configured." }],
        isError: true,
      };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(
        "id, ticket_number, type, status, priority, subject, created_at, updated_at, resolved_at",
      )
      .eq("ticket_number", ticket_number.toUpperCase())
      .ilike("contact_email", email)
      .maybeSingle();
    if (error) {
      return {
        content: [{ type: "text", text: `Lookup failed: ${error.message}` }],
        isError: true,
      };
    }
    if (!ticket) {
      return {
        content: [
          { type: "text", text: "No ticket found with that number and email." },
        ],
        isError: true,
      };
    }
    const { data: comments } = await supabase
      .from("ticket_comments")
      .select("author_name, body, is_admin, created_at")
      .eq("ticket_id", ticket.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });
    const thread = (comments ?? [])
      .map(
        (c) =>
          `- ${c.is_admin ? "SIDDHBALI" : c.author_name} (${c.created_at}): ${c.body}`,
      )
      .join("\n");
    const summary = `Ticket ${ticket.ticket_number} — ${ticket.subject}\nType: ${ticket.type} | Status: ${ticket.status} | Priority: ${ticket.priority}\nCreated: ${ticket.created_at}${ticket.resolved_at ? ` | Resolved: ${ticket.resolved_at}` : ""}${thread ? `\n\nReplies:\n${thread}` : "\n\nNo public replies yet."}`;
    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { ticket, comments: comments ?? [] },
    };
  },
});
