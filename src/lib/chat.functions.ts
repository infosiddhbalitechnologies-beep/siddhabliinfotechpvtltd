import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `You are SIDDH, the friendly AI assistant for SIDDHBALI TECHNOLOGIES — a technology services company based in Gorakhpur, Uttar Pradesh, India.

SIDDHBALI TECHNOLOGIES offers exactly eight services: IT Support & Service Desk, Software Development, Web & Application Development, AI & Data Solutions, Automation Solutions, Graphic Design, Research & Technical Writing, and Ticket Raising & Issue Management.

REPLY STYLE:
- Keep replies SHORT — 2-4 sentences for most answers, not paragraphs.
- When asked what you offer/do, name the services in one flowing sentence (not a bulleted list) and end by inviting them to say which one is closest to their need, e.g. "Tell me which one fits what you're working on and I'll point you in the right direction."
- Use markdown sparingly (bold, bullets) — only when it genuinely helps scanning, never by default.
- Maintain conversation context across turns.
- Do not claim services, industries, or capabilities beyond the eight services listed above.
- If you know the visitor's name (given below), address them by it naturally once in a while — not in every reply.

Help visitors with:
- Company information & mission
- The eight services listed above (point them to the Services page for details)
- Careers & open roles (point them to the Careers page or /apply to submit an application)
- Contact details (point them to the Contact page)
- Support tickets: explain that raising a support ticket is done right here in chat by saying something like "I want to raise a ticket", but that ticket CREATION requires the visitor to be logged in (existing tickets can always be looked up at /track without logging in).

If you cannot confidently answer (pricing quotes, partnerships, NDAs, legal, specific case studies, anything you're unsure about), DO NOT guess. Instead reply briefly and then suggest the user choose one of these next steps:
1. Contact Us — visit /contact
2. Business Enquiry — visit /contact (select Business Enquiry)
3. Raise a Ticket — say "raise a ticket" here in chat (login required), or visit /track to check an existing one

Never invent prices, names of employees, partner companies, or contractual details.`;

const MessageSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  guestToken: z.string().min(8).max(80).nullable().optional(),
  message: z.string().trim().min(1).max(4000),
});

async function getUserId(supabaseAdmin: any): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const auth = getRequestHeader("authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await supabaseAdmin.auth.getClaims(auth.slice(7));
      return (data?.claims?.sub as string) ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Slot-filling onboarding (name -> contact number -> free-form FAQ), Rasa-style.
// ---------------------------------------------------------------------------

const ASK_NAME_QUESTION =
  "Hi! I'm SIDDH, the assistant for SIDDHBALI TECHNOLOGIES. Before we get started, could you tell me your name?";
const ASK_NAME_REPROMPT =
  "Sorry, I didn't quite catch a name there — could you tell me your name?";
const ASK_CONTACT_QUESTION = (name: string) =>
  `Nice to meet you, ${name}! What's the best contact number to reach you on?`;
const ASK_CONTACT_REPROMPT =
  "That doesn't look like a valid contact number — could you share a phone number I can reach you on?";
const WELCOME_TO_FAQ = (name: string) =>
  `Thanks, ${name} — you're all set. Ask me anything about our services, industries we serve, or how to raise a support ticket.`;

// ---------------------------------------------------------------------------
// In-chat support-ticket sub-flow (category -> description -> priority ->
// confirm). Ticket CREATION is gated behind authentication; everything else
// in this file remains open to guests.
// ---------------------------------------------------------------------------

const LOGIN_REQUIRED_MESSAGE =
  "Sure, I can help you raise a support ticket. However, ticket creation is available only for logged-in users. Please log in to your account first.";

const TICKET_SERVICES = [
  "IT Support & Service Desk",
  "Software Development",
  "Web & Application Development",
  "AI & Data Solutions",
  "Automation Solutions",
  "Graphic Design",
  "Research & Technical Writing",
  "Ticket Raising & Issue Management",
];

const ASK_TICKET_CATEGORY = `Sure! Let's create a support ticket. Which of these is it about — ${TICKET_SERVICES.join(", ")} — or something else? You can just describe it in your own words.`;
const ASK_TICKET_CATEGORY_REPROMPT =
  "Could you tell me which service or area this ticket is about?";
const ASK_TICKET_DESCRIPTION =
  "Got it. Now, please describe the issue or request in a bit more detail.";
const ASK_TICKET_DESCRIPTION_REPROMPT =
  "Could you give me a few more details about the issue so I can log it properly?";
const ASK_TICKET_PRIORITY =
  "What priority would you give this — low, normal, high, or urgent?";
const ASK_TICKET_PRIORITY_REPROMPT =
  "Sorry, I didn't catch that — is this low, normal, high, or urgent priority?";
const ASK_TICKET_CONFIRM = (
  category: string,
  description: string,
  priority: string,
) =>
  `Here's what I have:\n- Category: ${category}\n- Description: ${description}\n- Priority: ${priority}\n\nShall I go ahead and create this ticket? (yes/no)`;
const ASK_TICKET_CONFIRM_REPROMPT =
  'Please reply "yes" to confirm or "no" to cancel.';
const TICKET_CANCELLED =
  "No problem, I've cancelled that. Let me know if you'd like to raise a ticket later.";
const TICKET_CREATED = (ticketNumber: string) =>
  `Your ticket has been created successfully. ✅\n\nTicket ID: #${ticketNumber}\n\nYou can use this ID to track your support request.`;
const AUTH_REQUIRED_FOR_TICKET = "Authentication required to create a ticket.";

/**
 * Lightweight rule-based intent match — this is what makes the bot feel
 * "Rasa-like": a small NLU rule layer in front of the free-form LLM stage,
 * rather than sending every message to Gemini.
 */
function detectTicketIntent(message: string): "create" | "howto" | null {
  const lower = message.toLowerCase();
  if (!/\bticket\b/.test(lower)) return null;
  const createVerbs =
    /\b(raise|create|open|file|log|submit|start|need|want|make)\b/;
  const howtoWords = /\b(how|what|steps|process|can i|could i)\b/;
  if (createVerbs.test(lower) && !howtoWords.test(lower)) return "create";
  return "howto";
}

function parsePriority(
  message: string,
): "low" | "normal" | "high" | "urgent" | null {
  const lower = message.toLowerCase();
  if (/\b(urgent|critical|asap|emergency)\b/.test(lower)) return "urgent";
  if (/\bhigh\b/.test(lower)) return "high";
  if (/\b(low|minor)\b/.test(lower)) return "low";
  if (/\b(normal|medium|standard|regular)\b/.test(lower)) return "normal";
  return null;
}

function parseYesNo(message: string): boolean | null {
  const lower = message.trim().toLowerCase();
  if (/^(y|yes|yep|yeah|confirm|correct|go ahead|sure)\b/.test(lower))
    return true;
  if (/^(n|no|nope|cancel|stop|never mind)\b/.test(lower)) return false;
  return null;
}

/**
 * Creates an "it_support" ticket for an authenticated visitor. Re-verifies
 * the caller is who the session thinks they are (a fresh, real Supabase
 * user id resolved from the Authorization header) before writing anything —
 * never trusts a user id that merely lives in chat_sessions or client state.
 */
async function createSupportTicketForUser(
  supabaseAdmin: any,
  userId: string,
  draft: { category: string; description: string; priority: string },
) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name,email")
    .eq("id", userId)
    .maybeSingle();

  const { data: row, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      type: "it_support",
      subject: draft.category.slice(0, 200),
      message: draft.description,
      contact_name: profile?.full_name || profile?.email || "User",
      contact_email: profile?.email || "",
      category: draft.category,
      priority: draft.priority,
      submitted_by: userId,
    } as never)
    .select("id, ticket_number, status, created_at")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

const CreateTicketSchema = z.object({
  category: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

/**
 * Standalone, directly-callable ticket-creation endpoint — independent of
 * the chat flow above. `requireSupabaseAuth` rejects any call without a
 * valid Supabase session before the handler even runs, and the insert goes
 * through `context.supabase` (the RLS-scoped client bound to that user's
 * token, not the service-role client), so the "IT support tickets require
 * authenticated owner" policy is enforced by the database itself — not just
 * this code. `submitted_by` always comes from the verified session, never
 * from the request body.
 */
export const createChatbotTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => CreateTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: row, error } = await context.supabase
      .from("tickets")
      .insert({
        type: "it_support",
        subject: data.category.slice(0, 200),
        message: data.description,
        contact_name: profile?.full_name || profile?.email || "User",
        contact_email: profile?.email || "",
        category: data.category,
        priority: data.priority,
        submitted_by: context.userId,
      } as never)
      .select("id, ticket_number, status, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

function getGeminiCreds() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return { apiKey, model };
}

async function callGemini(
  apiKey: string,
  model: string,
  systemInstruction: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
) {
  const aiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    },
  );

  if (!aiResp.ok) {
    const txt = await aiResp.text().catch(() => "");
    console.error("Gemini API error", aiResp.status, txt);
    if (aiResp.status === 429)
      throw new Error("Too many requests — please slow down.");
    if (aiResp.status === 400 || aiResp.status === 401 || aiResp.status === 403)
      throw new Error("AI service is not configured correctly.");
    throw new Error("AI service is temporarily unavailable.");
  }
  const aiJson: any = await aiResp.json();
  const text: string = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

const NAME_VALIDATION_PROMPT = `You validate the "name" slot for a chatbot's onboarding form.
Given the visitor's raw reply, decide whether it contains a plausible human first name (any language/script is fine).
It is NOT a valid name if it is empty, a greeting only, a question, gibberish, or clearly not a name.
Respond with ONLY a compact JSON object, no markdown, no code fences, in this exact shape:
{"valid": true|false, "name": "<the extracted name in Title Case, or empty string if invalid>"}`;

async function validateNameWithGemini(
  apiKey: string,
  model: string,
  rawReply: string,
): Promise<{ valid: boolean; name: string }> {
  try {
    const text = await callGemini(apiKey, model, NAME_VALIDATION_PROMPT, [
      { role: "user", parts: [{ text: rawReply }] },
    ]);
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const name = String(parsed?.name ?? "").trim();
    return { valid: Boolean(parsed?.valid) && name.length > 0, name };
  } catch (err) {
    console.error("[chat] name validation failed, falling back:", err);
    // Fallback heuristic so a transient AI hiccup doesn't block onboarding:
    // accept short, letters-only-ish replies as a name.
    const trimmed = rawReply.trim();
    const looksLikeName =
      trimmed.length >= 2 &&
      trimmed.length <= 60 &&
      !trimmed.includes("?") &&
      /^[\p{L}\s.'-]+$/u.test(trimmed);
    return { valid: looksLikeName, name: trimmed };
  }
}

function validateContactNumber(rawReply: string): {
  valid: boolean;
  contact: string;
} {
  const trimmed = rawReply.trim();
  // Strip everything except digits and a leading "+" so formats like
  // "+91 98765 43210" or "(0512) 234-5678" are accepted.
  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const digitCount = digitsOnly.replace(/\+/g, "").length;
  return { valid: digitCount >= 7 && digitCount <= 15, contact: trimmed };
}

/**
 * Starts a brand-new chat session and returns SIDDH's opening question
 * ("what's your name?") without requiring the visitor to type first.
 */
export const startChatSession = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ guestToken: z.string().min(8).max(80).nullable().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const userId = await getUserId(supabaseAdmin);

    const { data: created, error: createErr } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        user_id: userId,
        guest_token: userId ? null : (data.guestToken ?? crypto.randomUUID()),
        title: "New conversation",
        stage: "ask_name",
      })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("[chat] Could not start chat session:", createErr);
      throw new Error("Could not start chat session");
    }

    await supabaseAdmin.from("chat_messages").insert({
      session_id: created.id,
      role: "assistant",
      content: ASK_NAME_QUESTION,
    });

    return { sessionId: created.id, reply: ASK_NAME_QUESTION };
  });

type Stage =
  | "ask_name"
  | "ask_contact"
  | "faq"
  | "ticket_category"
  | "ticket_description"
  | "ticket_priority"
  | "ticket_confirm";

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((input) => MessageSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const userId = await getUserId(supabaseAdmin);

    // Resolve or create session
    let sessionId = data.sessionId ?? null;
    let stage: Stage = "ask_name";
    let visitorName: string | null = null;
    let ticketDraft: Record<string, any> = {};

    if (sessionId) {
      const { data: sess } = await supabaseAdmin
        .from("chat_sessions")
        .select(
          "id,user_id,guest_token,stage,visitor_name,visitor_contact,ticket_draft",
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (!sess) sessionId = null;
      else if (userId && sess.user_id !== userId) sessionId = null;
      else if (!userId && sess.user_id) sessionId = null;
      else {
        stage = (sess.stage as Stage) ?? "ask_name";
        visitorName = sess.visitor_name ?? null;
        ticketDraft = (sess.ticket_draft as Record<string, any>) ?? {};
      }
    }
    if (!sessionId) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("chat_sessions")
        .insert({
          user_id: userId,
          guest_token: userId ? null : (data.guestToken ?? crypto.randomUUID()),
          title: data.message.slice(0, 60),
          stage: "ask_name",
        })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("[chat] Could not create chat_sessions row:", createErr);
        throw new Error("Could not start chat session");
      }
      sessionId = created.id;
      stage = "ask_name";
    }

    // Save user message
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: data.message,
    });

    const { apiKey, model } = getGeminiCreds();

    // ---- Slot: visitor name -------------------------------------------------
    if (stage === "ask_name") {
      const { valid, name } = await validateNameWithGemini(
        apiKey,
        model,
        data.message,
      );
      const reply = valid ? ASK_CONTACT_QUESTION(name) : ASK_NAME_REPROMPT;
      const nextStage = valid ? "ask_contact" : "ask_name";

      await supabaseAdmin
        .from("chat_sessions")
        .update({
          stage: nextStage,
          ...(valid ? { visitor_name: name } : {}),
        })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return {
        sessionId,
        reply,
        stage: nextStage,
        visitorName: valid ? name : visitorName,
      };
    }

    // ---- Slot: contact number ------------------------------------------------
    if (stage === "ask_contact") {
      const { valid, contact } = validateContactNumber(data.message);
      const name = visitorName ?? "there";
      const reply = valid ? WELCOME_TO_FAQ(name) : ASK_CONTACT_REPROMPT;
      const nextStage = valid ? "faq" : "ask_contact";

      await supabaseAdmin
        .from("chat_sessions")
        .update({
          stage: nextStage,
          ...(valid ? { visitor_contact: contact } : {}),
        })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return { sessionId, reply, stage: nextStage, visitorName };
    }

    // ---- Support-ticket sub-flow (login-gated) -------------------------------
    if (stage === "ticket_category") {
      const category = data.message.trim();
      const valid = category.length >= 2;
      const reply = valid
        ? ASK_TICKET_DESCRIPTION
        : ASK_TICKET_CATEGORY_REPROMPT;
      const nextStage = valid ? "ticket_description" : "ticket_category";
      const nextDraft = valid ? { ...ticketDraft, category } : ticketDraft;

      await supabaseAdmin
        .from("chat_sessions")
        .update({ stage: nextStage, ticket_draft: nextDraft })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return { sessionId, reply, stage: nextStage, visitorName };
    }

    if (stage === "ticket_description") {
      const description = data.message.trim();
      const valid = description.length >= 5;
      const reply = valid
        ? ASK_TICKET_PRIORITY
        : ASK_TICKET_DESCRIPTION_REPROMPT;
      const nextStage = valid ? "ticket_priority" : "ticket_description";
      const nextDraft = valid ? { ...ticketDraft, description } : ticketDraft;

      await supabaseAdmin
        .from("chat_sessions")
        .update({ stage: nextStage, ticket_draft: nextDraft })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return { sessionId, reply, stage: nextStage, visitorName };
    }

    if (stage === "ticket_priority") {
      const priority = parsePriority(data.message);
      const nextStage = priority ? "ticket_confirm" : "ticket_priority";
      const nextDraft = priority ? { ...ticketDraft, priority } : ticketDraft;
      const reply = priority
        ? ASK_TICKET_CONFIRM(
            nextDraft.category,
            nextDraft.description,
            priority,
          )
        : ASK_TICKET_PRIORITY_REPROMPT;

      await supabaseAdmin
        .from("chat_sessions")
        .update({ stage: nextStage, ticket_draft: nextDraft })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return { sessionId, reply, stage: nextStage, visitorName };
    }

    if (stage === "ticket_confirm") {
      const answer = parseYesNo(data.message);
      if (answer === null) {
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: ASK_TICKET_CONFIRM_REPROMPT,
        });
        return {
          sessionId,
          reply: ASK_TICKET_CONFIRM_REPROMPT,
          stage,
          visitorName,
        };
      }
      if (!answer) {
        await supabaseAdmin
          .from("chat_sessions")
          .update({ stage: "faq", ticket_draft: {} })
          .eq("id", sessionId);
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: TICKET_CANCELLED,
        });
        return {
          sessionId,
          reply: TICKET_CANCELLED,
          stage: "faq",
          visitorName,
        };
      }

      // Re-verify the session is still authenticated right before writing —
      // never trust that an earlier turn's auth check still holds.
      const freshUserId = await getUserId(supabaseAdmin);
      if (!freshUserId) {
        await supabaseAdmin
          .from("chat_sessions")
          .update({ stage: "faq", ticket_draft: {} })
          .eq("id", sessionId);
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: AUTH_REQUIRED_FOR_TICKET,
        });
        return {
          sessionId,
          reply: AUTH_REQUIRED_FOR_TICKET,
          stage: "faq",
          visitorName,
        };
      }

      const ticket = await createSupportTicketForUser(
        supabaseAdmin,
        freshUserId,
        {
          category: ticketDraft.category,
          description: ticketDraft.description,
          priority: ticketDraft.priority,
        },
      );
      const reply = TICKET_CREATED(ticket.ticket_number);

      await supabaseAdmin
        .from("chat_sessions")
        .update({ stage: "faq", ticket_draft: {} })
        .eq("id", sessionId);
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: reply,
      });
      return { sessionId, reply, stage: "faq", visitorName };
    }

    // ---- Free-form FAQ (services / industries / tickets / etc.) -------------

    // Rule-based intent check before falling back to the LLM — this is what
    // enforces "ticket creation requires login" regardless of how Gemini
    // might otherwise be prompted to answer.
    const ticketIntent = detectTicketIntent(data.message);
    if (ticketIntent) {
      if (!userId) {
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: LOGIN_REQUIRED_MESSAGE,
        });
        return {
          sessionId,
          reply: LOGIN_REQUIRED_MESSAGE,
          stage: "faq",
          visitorName,
          action: "login_required",
        };
      }
      if (ticketIntent === "create") {
        await supabaseAdmin
          .from("chat_sessions")
          .update({ stage: "ticket_category", ticket_draft: {} })
          .eq("id", sessionId);
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: ASK_TICKET_CATEGORY,
        });
        return {
          sessionId,
          reply: ASK_TICKET_CATEGORY,
          stage: "ticket_category",
          visitorName,
        };
      }
      // "howto" + authenticated: explain, but don't force-start the flow.
      const howtoReply =
        'You can raise a support ticket any time — just tell me "I want to raise a ticket" and I\'ll walk you through the category, a description, and priority.';
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: howtoReply,
      });
      return { sessionId, reply: howtoReply, stage: "faq", visitorName };
    }

    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role,content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(40);

    const contents = (history ?? [])
      // Onboarding turns are noise for the FAQ model — keep context focused
      // on the actual Q&A once the visitor reaches the FAQ stage.
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const personalizedPrompt = visitorName
      ? `${SYSTEM_PROMPT}\n\nThe visitor's name is ${visitorName}. They are currently ${userId ? "logged in" : "browsing as a guest (not logged in)"}.`
      : SYSTEM_PROMPT;

    const reply =
      (await callGemini(apiKey, model, personalizedPrompt, contents)) ||
      "Sorry, I couldn't generate a response.";

    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: reply,
    });

    return { sessionId, reply, stage: "faq" as const, visitorName };
  });

export const getChatSession = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        sessionId: z.string().uuid(),
        guestToken: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const userId = await getUserId(supabaseAdmin);

    const { data: sess } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!sess) return { session: null, messages: [] };
    if (userId) {
      if (sess.user_id !== userId) return { session: null, messages: [] };
    } else {
      if (!data.guestToken || sess.guest_token !== data.guestToken)
        return { session: null, messages: [] };
    }
    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    return { session: sess, messages: messages ?? [] };
  });

export const listMyChatSessions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const userId = await getUserId(supabaseAdmin);
    if (!userId) return { sessions: [] };
    const { data } = await supabaseAdmin
      .from("chat_sessions")
      .select("id,title,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    return { sessions: data ?? [] };
  },
);

export const listAdminChatSessions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id,title,user_id,guest_token,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    const userIds = Array.from(
      new Set((sessions ?? []).map((s: any) => s.user_id).filter(Boolean)),
    );
    let emailMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      emailMap = new Map((profs ?? []).map((p: any) => [p.id, p.email]));
    }
    return {
      sessions: (sessions ?? []).map((s: any) => ({
        ...s,
        user_email: s.user_id ? (emailMap.get(s.user_id) ?? null) : null,
      })),
    };
  });

export const getAdminChatSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    return { session, messages: messages ?? [] };
  });
