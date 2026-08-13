# Chatbot onboarding (name → contact number → FAQ) — what changed

This adds a Rasa-style slot-filling flow in front of your existing Gemini-powered
FAQ chatbot ("SIDDH"): the bot now asks for the visitor's **name**, validates it
with Gemini, then asks for a **contact number**, and only after both are collected
does it hand off to free-form Q&A (services / industries / support tickets, etc.)
using the FAQ logic that was already in place.

## Files changed

- `supabase/migrations/20260810120000_add_chat_onboarding_slots.sql` — **new**
  migration. Adds `stage`, `visitor_name`, `visitor_contact` columns to
  `chat_sessions`. **You need to apply this migration to your Supabase project**
  (`supabase db push` or run it in the SQL editor) before the new flow will work.
- `src/integrations/supabase/types.ts` — hand-patched to match the new columns
  so TypeScript compiles. Once the migration is applied, regenerate this file
  the normal way (`supabase gen types typescript`) to replace my manual edit.
- `src/lib/chat.functions.ts`
  - New `startChatSession` server function: creates a session and returns
    SIDDH's opening question ("what's your name?") without waiting for the
    visitor to type first.
  - `sendChatMessage` now branches on `session.stage`:
    - `ask_name` — sends the visitor's reply to Gemini with a small validation
      prompt that extracts a name and returns `{valid, name}` as JSON. Invalid/empty
      replies get a re-prompt ("repeat the question"); a valid reply stores
      `visitor_name` and advances to `ask_contact`.
    - `ask_contact` — validates the reply as a phone number (7–15 digits,
      optional `+`). Invalid/empty replies get a re-prompt; a valid reply
      stores `visitor_contact` and advances to `faq`.
    - `faq` — behaves like the original chatbot: full conversation history is
      sent to Gemini using the existing `SYSTEM_PROMPT` (now lightly
      personalized with the visitor's name).
  - Uses your existing `GEMINI_API_KEY` / `GEMINI_MODEL` from `.env` — no new
    env vars needed. (Note: your `.env` has a Gemini key, not "Gemma"; Gemini
    is what's wired up.)
- `src/components/site/ChatWidget.tsx`
  - Calls `startChatSession` on first open so SIDDH greets with the name
    question immediately.
  - Tracks `stage` from server responses; the quick-reply chips ("What
    services do you offer?" etc.) are now only shown once `stage === "faq"`,
    so they don't appear while the bot is still collecting name/contact.
  - Input placeholder changes contextually ("Type your name…" → "Type your
    contact number…" → "Type a message…").

## Behavior notes / assumptions

- "If the user does not give an answer" is treated as *any invalid/empty
  reply* at a given step (not just a literally empty message) — the bot
  re-asks the same question either way.
- Name validation intentionally uses Gemini (per your request) since it can
  tell "John" apart from "what services do you have?" or "asdlkj". If the
  Gemini call itself fails (network hiccup, quota), there's a small local
  fallback heuristic so onboarding doesn't get stuck.
- Contact number validation is a plain regex (7–15 digits, optional leading
  `+`) rather than an AI call, since a phone number doesn't need semantic
  judgement — happy to switch this to Gemini too if you'd rather keep it
  consistent.
- Once in the `faq` stage, everything else (services, industries, "how do I
  raise a ticket") is unchanged — it's still your existing Gemini system
  prompt and `/track`, `/contact`, `/auth` links.

## FastAPI endpoints (`chatbot-api/`)

A standalone FastAPI service exposing this same flow as REST endpoints, for
connecting the chatbot to things other than this TanStack Start app (a
separate site, WhatsApp, a partner integration, etc.). It reads/writes the
same `chat_sessions`/`chat_messages` Supabase tables via the service-role
key, so sessions are interchangeable with the widget above.

Endpoints: `POST /api/chat/start`, `POST /api/chat/message`,
`GET /api/chat/session/{session_id}`, `POST /api/tickets`, plus `GET /health`
and interactive docs at `/docs`. Full setup, request/response examples, and a
frontend integration snippet are in `chatbot-api/README.md`.

## Guest vs. logged-in visitors + login-gated ticket creation

**What changed:** chatting (services, industries, general questions, how
ticketing works) stays open to everyone. Only *creating* a support ticket
now requires being logged in, enforced **server-side** — not just hidden in
the UI.

**New migrations:**
- `20260812090000_add_it_support_ticket_type.sql` — adds an `it_support`
  ticket type plus `category`/`industry` columns to `tickets`. The existing
  `contact`/`career`/`enquiry` types (used by the public Contact/Careers
  forms) are untouched and still open to guests — only `it_support` (the
  chatbot's own tickets) is gated.
- `20260812090100_secure_it_support_tickets.sql` — rewrites the ticket
  INSERT policy so `it_support` tickets can **only** be inserted by an
  authenticated user, and only as their own `submitted_by`. This holds even
  if someone calls the `tickets` table directly, bypassing the app entirely
  — real defense in depth, not just an app-level check.
- `20260812090200_chat_ticket_flow_stages.sql` — extends `chat_sessions`
  with the ticket sub-flow's stages (`ticket_category`, `ticket_description`,
  `ticket_priority`, `ticket_confirm`) and a `ticket_draft` JSONB scratch
  column.

**`src/lib/chat.functions.ts`:**
- A small rule-based intent check (`detectTicketIntent`) runs before the
  Gemini FAQ call, so "I want to raise a ticket" reliably triggers the flow
  regardless of what the LLM might otherwise say — this is the "Rasa-like"
  NLU layer in front of the free-form LLM stage.
- Guests get the exact scripted message from the spec plus
  `action: "login_required"` in the response, so the UI can render a login
  button without guessing.
- Authenticated users get a full slot-filling ticket flow: category →
  description → priority → yes/no confirm → ticket created, ending with
  "Your ticket has been created successfully. ✅ Ticket ID: #...".
- The JWT is **re-verified immediately before writing the ticket** (not just
  trusted from the stage check earlier in the conversation) — if the session
  expired mid-flow, it falls back to "Authentication required to create a
  ticket." instead of silently creating an orphaned ticket.
- New standalone `createChatbotTicket` server function, protected by the
  existing `requireSupabaseAuth` middleware and writing through the
  RLS-scoped `context.supabase` client (not the service-role client) — so
  it's hardened against direct calls independent of the chat UI, and
  `submitted_by` always comes from the verified session, never the request
  body.

**`src/components/site/ChatWidget.tsx`:**
- Renders a "Login to Create Ticket" button when a reply comes back with
  `action: "login_required"`.
- Sets a `localStorage` flag right before sending the visitor to `/auth`;
  once it sees they're logged in, it reopens the widget and automatically
  resends "I want to raise a ticket" so they don't have to ask again. This
  is a pragmatic approximation of "return them to the flow" — it re-asks
  rather than deep-linking back into an exact mid-flow state, since the
  chatbot is mounted globally and there's no return-url plumbing through
  `/auth` yet.

**`chatbot-api/` (FastAPI):**
- Mirrors the same intent detection, ticket sub-flow, and login-gating.
- `app/auth.py` verifies the visitor's Supabase access token against the
  Auth server on every call (`resolve_user_id`) — nothing is cached or
  trusted from an earlier request — and, where `SUPABASE_PUBLISHABLE_KEY` is
  configured, builds an RLS-scoped client for ticket inserts so the same
  database policy backs this service too.
- New standalone `POST /api/tickets` endpoint: verified to return **401**
  for requests with no/invalid `Authorization` header before any database
  write is attempted (see `chatbot-api/README.md` for the exact curl
  reproduction).
- Requires one new env var: `SUPABASE_PUBLISHABLE_KEY` (same anon key your
  website already has, just also given to this service). Without it, every
  visitor is treated as a guest and ticket creation always requires login —
  it fails safe rather than silently trusting anyone.

## To run

1. Apply the new migrations to your Supabase project (in order — the
   ticket-type enum addition and its first use must be in separate
   transactions, which is why they're separate files).
2. `npm install` / `bun install` as usual, then run the dev server.
3. Open the chat widget — it should now start with "What's your name?", and
   "I want to raise a ticket" will ask you to log in if you aren't already.
