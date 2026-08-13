import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import {
  sendChatMessage,
  getChatSession,
  startChatSession,
} from "@/lib/chat.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

type Stage =
  | "ask_name"
  | "ask_contact"
  | "faq"
  | "ticket_category"
  | "ticket_description"
  | "ticket_priority"
  | "ticket_confirm";

const QUICK_REPLIES = [
  "What services do you offer?",
  "How much does a project cost?",
  "What's your typical timeline?",
];

const STORAGE_KEY = "siddh_chat_session_v1";
const GUEST_KEY = "siddh_chat_guest_v1";
// Set right before sending the visitor to /auth from the ticket-login
// prompt; picked back up once they're signed in so the ticket flow can
// resume automatically instead of making them ask again.
const PENDING_TICKET_KEY = "siddh_chat_pending_ticket_v1";
// Best-effort snapshot of the name/contact number the visitor already gave
// this session, captured right before the /auth redirect. The guest's chat
// session can never be reattached to their account once they log in (its
// row is permanently guest-owned), so a fresh, authenticated session has to
// be started after login — this lets that fresh session skip straight past
// the name/contact questions instead of asking the visitor to repeat them.
const PENDING_TICKET_CONTEXT_KEY = "siddh_chat_pending_ticket_ctx_v1";

function loadStored() {
  if (typeof window === "undefined")
    return {
      sessionId: null as string | null,
      guestToken: null as string | null,
    };
  return {
    sessionId: localStorage.getItem(STORAGE_KEY),
    guestToken: localStorage.getItem(GUEST_KEY),
  };
}

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [stage, setStage] = useState<Stage>("ask_name");
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useServerFn(sendChatMessage);
  const fetchSession = useServerFn(getChatSession);
  const start = useServerFn(startChatSession);

  // Initialize identifiers
  useEffect(() => {
    const stored = loadStored();
    setSessionId(stored.sessionId);
    let g = stored.guestToken;
    if (!user && !g) {
      g = crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, g);
    }
    setGuestToken(g);
  }, [user]);

  // Low-level send: posts one message against an explicit session id and
  // returns the raw response. Used both by the normal input box and by the
  // post-login resume flow below, which needs to thread the session id it
  // gets back from one automated reply into the next one immediately —
  // component state updates are async, so that hand-off can't rely on the
  // `sessionId` state variable being fresh yet.
  async function sendRaw(text: string, sid: string | null) {
    return (await send({
      data: { sessionId: sid, guestToken, message: text },
    })) as any;
  }

  // Runs one turn of the conversation as if the visitor had typed it: adds
  // the user bubble, calls the backend, applies whatever it returns.
  async function runTurn(text: string, sid: string | null) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await sendRaw(text, sid);
      if (res?.sessionId) {
        setSessionId(res.sessionId);
        localStorage.setItem(STORAGE_KEY, res.sessionId);
      }
      if (res?.stage) setStage(res.stage);
      if (res?.action === "login_required") setNeedsLogin(true);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
      return res;
    } finally {
      setSending(false);
    }
  }

  // After a successful login triggered by the "Login to Create Ticket"
  // prompt, drives the fresh session (sid/curStage passed in explicitly —
  // see sendRaw's comment above) back to the ticket flow: replays the
  // name/contact answers we snapshotted before redirecting, if we have
  // them, then re-asks to raise a ticket now that the visitor is
  // authenticated.
  async function resumeTicketFlow(sid: string | null, initialStage: Stage) {
    let curStage = initialStage;
    const raw = localStorage.getItem(PENDING_TICKET_CONTEXT_KEY);
    localStorage.removeItem(PENDING_TICKET_CONTEXT_KEY);
    let ctx: { visitorName?: string | null; visitorContact?: string | null } | null =
      null;
    if (raw) {
      try {
        ctx = JSON.parse(raw);
      } catch {
        ctx = null;
      }
    }

    try {
      if (curStage === "ask_name" && ctx?.visitorName) {
        const res = await runTurn(ctx.visitorName, sid);
        if (res?.sessionId) sid = res.sessionId;
        if (res?.stage) curStage = res.stage;
      }
      if (curStage === "ask_contact" && ctx?.visitorContact) {
        const res = await runTurn(ctx.visitorContact, sid);
        if (res?.sessionId) sid = res.sessionId;
        if (res?.stage) curStage = res.stage;
      }
      if (curStage === "faq") {
        await runTurn("I want to raise a ticket", sid);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `I couldn't reach the assistant right now. ${err?.message ?? ""}`.trim(),
        },
      ]);
      setShowFallback(true);
    }
  }

  // Opens the widget: loads the existing session if we still have a valid
  // one, otherwise starts a new one — and if we were sent here to resume an
  // in-progress ticket after logging in, hands off to resumeTicketFlow once
  // a usable session is in place.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function hydrate() {
      const isResume =
        typeof window !== "undefined" &&
        localStorage.getItem(PENDING_TICKET_KEY) === "1";
      if (isResume) localStorage.removeItem(PENDING_TICKET_KEY);

      let sid = sessionId;
      let curStage: Stage = stage;

      if (sid) {
        try {
          const res: any = await fetchSession({
            data: { sessionId: sid, guestToken: guestToken ?? undefined },
          });
          if (!cancelled && res?.session) {
            curStage = (res.session.stage as Stage) ?? "faq";
            setStage(curStage);
            setMessages(
              res.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
              })),
            );
          } else if (!cancelled) {
            // Session no longer belongs to the current visitor (e.g. it was
            // a guest session and they've since logged in) — it can't be
            // reused, so fall through and start a fresh one below.
            localStorage.removeItem(STORAGE_KEY);
            sid = null;
          }
        } catch {
          // Network hiccup — leave existing state as-is rather than
          // discarding a possibly-still-valid session.
          if (cancelled) return;
        }
      }

      if (cancelled) return;

      if (!sid && !starting) {
        setStarting(true);
        try {
          const res: any = await start({
            data: { guestToken: guestToken ?? undefined },
          });
          if (cancelled) return;
          if (res?.sessionId) {
            sid = res.sessionId;
            setSessionId(res.sessionId);
            localStorage.setItem(STORAGE_KEY, res.sessionId);
          }
          curStage = "ask_name";
          setStage("ask_name");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.reply },
          ]);
        } catch {
          /* ignore — the static placeholder below still shows */
        } finally {
          if (!cancelled) setStarting(false);
        }
      }

      if (isResume && !cancelled) {
        await resumeTicketFlow(sid, curStage);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // Allow the floating action menu to open this existing chatbot.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("siddh:open-chat", handler);
    return () => window.removeEventListener("siddh:open-chat", handler);
  }, []);

  // Reopen the widget once the visitor is back and authenticated, if they
  // left it mid-ticket to log in. Reopening (open: false -> true) triggers
  // the hydrate effect above, which does the actual resume.
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(PENDING_TICKET_KEY)) {
      setOpen(true);
    }
  }, [user]);

  async function handleSend(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setShowFallback(false);
    setNeedsLogin(false);
    try {
      await runTurn(text, sessionId);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `I couldn't reach the assistant right now. ${err?.message ?? ""}`.trim(),
        },
      ]);
      setShowFallback(true);
    }
  }

  return (
    <>
      {/* Floating launcher — shown while chatting; opening is also handled by the floating action menu */}
      {open && (
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => setOpen(false)}
          className={cn(
            "fixed bottom-5 right-5 z-[75] flex h-14 w-14 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <X className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed z-[75] flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
            "bottom-24 right-5 w-[calc(100vw-2.5rem)] max-w-[380px] h-[70vh] max-h-[560px]",
            "sm:w-[380px]",
          )}
          role="dialog"
          aria-label="SIDDH assistant"
        >
          <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none text-foreground">
                SIDDH Assistant
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ask about services, support or projects…
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                Hi! I'm SIDDH. Ask me about SIDDHBALI TECHNOLOGIES services,
                solutions, support tickets, careers or how to get in touch.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={m.id ?? i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {showFallback && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="mb-2 font-medium text-foreground">
                  Need a human? Try one of these:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-2.5 py-1 text-primary-foreground hover:opacity-90"
                  >
                    Contact Us
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-2.5 py-1 text-foreground hover:bg-muted"
                  >
                    Business Enquiry
                  </Link>
                  <Link
                    to={user ? "/dashboard" : "/auth"}
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-2.5 py-1 text-foreground hover:bg-muted"
                  >
                    Raise a Ticket
                  </Link>
                </div>
              </div>
            )}
            {needsLogin && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="mb-2 text-foreground">
                  Ticket creation needs an account so we can track it back to
                  you.
                </p>
                <Link
                  to="/auth"
                  onClick={() => {
                    localStorage.setItem(PENDING_TICKET_KEY, "1");
                    if (sessionId) {
                      fetchSession({
                        data: {
                          sessionId,
                          guestToken: guestToken ?? undefined,
                        },
                      })
                        .then((res: any) => {
                          const visitorName = res?.session?.visitor_name ?? null;
                          const visitorContact =
                            res?.session?.visitor_contact ?? null;
                          if (visitorName || visitorContact) {
                            localStorage.setItem(
                              PENDING_TICKET_CONTEXT_KEY,
                              JSON.stringify({ visitorName, visitorContact }),
                            );
                          }
                        })
                        .catch(() => {
                          // Best-effort only — the resume flow still works
                          // without this, it'll just re-ask for name/contact.
                        });
                    }
                    setOpen(false);
                  }}
                  className="inline-block rounded-md bg-primary px-2.5 py-1.5 font-medium text-primary-foreground hover:opacity-90"
                >
                  Login to Create Ticket
                </Link>
              </div>
            )}
            {!sending && !showFallback && stage === "faq" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(undefined, q)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-border bg-background px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                stage === "ask_name"
                  ? "Type your name…"
                  : stage === "ask_contact"
                    ? "Type your contact number…"
                    : stage === "ticket_category"
                      ? "Which service is this about?"
                      : stage === "ticket_description"
                        ? "Describe the issue…"
                        : stage === "ticket_priority"
                          ? "Low, normal, high, or urgent?"
                          : stage === "ticket_confirm"
                            ? "Type yes or no…"
                            : "Type a message…"
              }
              disabled={sending}
              className="flex-1 rounded-full border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}