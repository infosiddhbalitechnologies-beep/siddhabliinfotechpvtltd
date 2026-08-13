# SIDDH Chatbot API (FastAPI)

A standalone FastAPI service exposing the same name → contact-number → FAQ
chatbot flow as REST endpoints, so any frontend (your website widget, a
mobile app, WhatsApp integration, etc.) can drive it over HTTP instead of
TanStack Start server functions.

It reads/writes the **same Supabase tables** (`chat_sessions`,
`chat_messages`) that the website already uses, via the service-role key —
so a session started here shows up identically in your admin chat dashboard,
and vice versa. Make sure you've applied
`supabase/migrations/20260810120000_add_chat_onboarding_slots.sql` first.

## 1. Setup

```bash
cd chatbot-api
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in the same values as your website's .env
```

Required env vars (`.env`):

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY` | Same key your website already uses |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |
| `SUPABASE_URL` | Same project as your website |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** — never expose this to a browser |
| `CORS_ORIGINS` | Comma-separated list of origins allowed to call this API, e.g. `https://sidddhbali.tech` |

## 2. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs: `http://localhost:8000/docs` (Swagger) or `/redoc`.

## 3. Authentication (guest vs logged-in)

Chatting is always open to guests. Only **ticket creation** requires being
signed in, and this is enforced **server-side**, not just in the UI:

- Pass the visitor's Supabase access token as `Authorization: Bearer <token>`
  on `/api/chat/message` and `/api/tickets`. Every call re-verifies the token
  against Supabase itself (`app/auth.py`) — nothing is cached or trusted from
  an earlier request.
- If a guest (no/invalid token) tries to raise a ticket via chat, they get
  back the scripted "please log in first" message plus
  `"action": "login_required"` so your UI can show a login button.
- If a guest — or anyone with an invalid/expired token — calls
  `POST /api/tickets` directly, it's rejected with **401** before any
  database write happens. Verified locally:

  ```bash
  curl -X POST http://localhost:8000/api/tickets \
    -H "Content-Type: application/json" \
    -d '{"category":"IT Support","description":"App is down","priority":"high"}'
  # → 401 {"detail":"Authentication required to create a ticket."}
  ```
- The ticket's `submitted_by` always comes from the verified token — the
  request body has no user-id field, so it can't be spoofed.
- The same protection exists at the database layer: the
  `20260812090100_secure_it_support_tickets.sql` migration's RLS policy
  rejects `it_support` ticket inserts unless `submitted_by = auth.uid()`,
  independent of this API's own checks.

If `SUPABASE_PUBLISHABLE_KEY` isn't set, every visitor is treated as a guest
and ticket creation always requires login — the service degrades safely
rather than silently trusting anyone.

## 4. Endpoints

### `POST /api/chat/start`
Starts a new session and returns SIDDH's opening question ("what's your
name?"). Call this once when the chat widget first opens.

```bash
curl -X POST http://localhost:8000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{}'
```
```json
{
  "session_id": "5c9b...",
  "guest_token": "a1b2c3...",
  "reply": "Hi! I'm SIDDH, the assistant for SIDDHBALI TECHNOLOGIES. Before we get started, could you tell me your name?",
  "stage": "ask_name"
}
```

Save both `session_id` and `guest_token` on the client (e.g. `localStorage`)
— you'll send both on every later call for an anonymous visitor.

### `POST /api/chat/message`
Sends the visitor's next message. Include `Authorization: Bearer <token>` if
the visitor is signed in — omit it (or send an expired/invalid token) and
they're treated as a guest. The response's `stage` tells you where the
conversation is:

- `ask_name` / `ask_contact` → still onboarding
- `faq` → normal Gemini-generated answers
- `ticket_category` / `ticket_description` / `ticket_priority` /
  `ticket_confirm` → mid-way through the login-gated ticket sub-flow

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "5c9b...", "guest_token": "a1b2c3...", "message": "Rohan Sharma"}'
```
```json
{
  "session_id": "5c9b...",
  "reply": "Nice to meet you, Rohan! What's the best contact number to reach you on?",
  "stage": "ask_contact",
  "visitor_name": "Rohan"
}
```

Once in `faq` stage, a guest asking to raise a ticket gets:

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "5c9b...", "guest_token": "a1b2c3...", "message": "I want to raise a ticket"}'
```
```json
{
  "session_id": "5c9b...",
  "reply": "Sure, I can help you raise a support ticket. However, ticket creation is available only for logged-in users. Please log in to your account first.",
  "stage": "faq",
  "action": "login_required"
}
```

The same message from a logged-in visitor (with a valid `Authorization`
header) instead starts the ticket sub-flow: category → description →
priority → yes/no confirm → ticket created, ending with:

```json
{
  "reply": "Your ticket has been created successfully. ✅\n\nTicket ID: #1042\n\nYou can use this ID to track your support request.",
  "stage": "faq"
}
```

### `GET /api/chat/session/{session_id}?guest_token=...`
Fetches the session's current stage/slots plus full message history — use
this to restore a conversation when the visitor reopens the widget.

### `POST /api/tickets`
Standalone ticket-creation endpoint, independent of the chat flow — for
cases where you already have category/description/priority and just want to
create a ticket directly. **Requires** a valid `Authorization: Bearer
<token>` header.

```bash
curl -X POST http://localhost:8000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <visitor's supabase access token>" \
  -d '{"category":"Software Development","description":"Login page throws a 500","priority":"high"}'
```
```json
{ "id": "...", "ticket_number": "1042", "status": "open", "created_at": "..." }
```

## 5. Wiring your website widget to this API

`src/components/site/ChatWidget.tsx` currently calls TanStack Start server
functions (`sendChatMessage`, `getChatSession`, `startChatSession`) directly
in-process. To call this API instead over HTTP, swap those calls for `fetch`,
e.g.:

```ts
const API_BASE = import.meta.env.VITE_CHAT_API_BASE_URL; // e.g. https://api.yoursite.com

async function startChat(guestToken?: string) {
  const res = await fetch(`${API_BASE}/api/chat/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_token: guestToken }),
  });
  if (!res.ok) throw new Error("Could not start chat");
  return res.json(); // { session_id, guest_token, reply, stage }
}

async function sendMessage(
  sessionId: string,
  guestToken: string,
  message: string,
  accessToken?: string, // the visitor's Supabase access token, if logged in
) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ session_id: sessionId, guest_token: guestToken, message }),
  });
  if (!res.ok) throw new Error("Could not send message");
  return res.json(); // { session_id, reply, stage, visitor_name, action? }
}
```

With Supabase's JS client, the access token is `(await supabase.auth.getSession()).data.session?.access_token` — pass that through whenever the visitor is signed in so the API can recognize them and let them create tickets; omit it and they're treated as a guest.

Note the field names are `snake_case` here (session_id, guest_token) vs. the
`camelCase` the TS server functions use — adjust the widget's response
handling accordingly if you switch it over. You can run both side by side:
keep the TS server functions for the on-site widget and use this API purely
for external integrations (a separate app, a partner's site, WhatsApp, etc.)
since they share the same database.

## 6. Deploying

Any standard ASGI host works (Render, Railway, Fly.io, a small VM behind
nginx, etc.):

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
# or, for production:
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000
```

Set `CORS_ORIGINS` to your real site origin(s) before going live — the
default in `.env.example` is permissive for local development only.
