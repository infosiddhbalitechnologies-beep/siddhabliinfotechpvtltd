import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "submit_ticket",
  title: "Submit a ticket to SIDDHBALI",
  description:
    "Create a support ticket in SIDDHBALI's system. Use type 'contact' for a general contact-us message, 'career' for a job application/career inquiry, or 'enquiry' for a business/partnership enquiry. Returns the generated ticket number.",
  inputSchema: {
    type: z.enum(["contact", "career", "enquiry"]).describe("Ticket type."),
    subject: z.string().min(2).max(200).describe("Short subject line."),
    message: z.string().min(5).max(5000).describe("Full message / details."),
    contact_name: z.string().min(1).max(120).describe("Submitter's full name."),
    contact_email: z
      .string()
      .email()
      .max(200)
      .describe("Submitter's email (used to track the ticket)."),
    contact_phone: z
      .string()
      .max(40)
      .optional()
      .describe("Optional phone number."),
    company: z.string().max(150).optional().describe("Optional company name."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async (input) => {
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
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        type: input.type,
        subject: input.subject,
        message: input.message,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone || null,
        company: input.company || null,
        details: {},
        submitted_by: null,
      })
      .select("ticket_number, status, created_at")
      .single();
    if (error || !data) {
      return {
        content: [
          {
            type: "text",
            text: `Could not create ticket: ${error?.message ?? "unknown error"}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Ticket created. Ticket number: ${data.ticket_number}. Status: ${data.status}. Track it at /track using the ticket number and the email you submitted.`,
        },
      ],
      structuredContent: {
        ticket_number: data.ticket_number,
        status: data.status,
        created_at: data.created_at,
      },
    };
  },
});
