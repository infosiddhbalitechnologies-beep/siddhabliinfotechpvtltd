import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackTicket } from "@/lib/tickets.functions";
import { toast } from "sonner";
import { Search, Ticket as TicketIcon } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track a ticket — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Look up the status of your submitted ticket using your ticket number and email.",
      },
    ],
  }),
  component: TrackPage,
});

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-yellow-500/20 text-yellow-300",
  waiting_on_user: "bg-orange-500/20 text-orange-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-gray-500/20 text-gray-300",
};

function TrackPage() {
  const track = useServerFn(trackTicket);
  const [num, setNum] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof trackTicket>
  > | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await track({ data: { ticket_number: num, email } });
      setResult(r);
    } catch (err: any) {
      toast.error(err.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-display font-bold text-center">
        Track your ticket
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Enter your ticket number and the email you submitted with.
      </p>
      <form onSubmit={submit} className="mt-8 glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">
            Ticket number
          </label>
          <input
            required
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="SIDDH-2026-001000"
            className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
          />
        </div>
        <button
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-5 py-2.5 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
        >
          <Search className="size-4" />{" "}
          {loading ? "Looking up…" : "Track ticket"}
        </button>
      </form>

      {result && (
        <div className="mt-8 glass rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TicketIcon className="size-3.5" />{" "}
                {result.ticket.ticket_number}
              </div>
              <h2 className="mt-1 text-xl font-display font-semibold">
                {result.ticket.subject}
              </h2>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_COLORS[result.ticket.status] ?? "bg-muted text-foreground"}`}
            >
              {result.ticket.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {result.ticket.message}
          </p>
          <div className="text-xs text-muted-foreground">
            Submitted {new Date(result.ticket.created_at).toLocaleString()}
            {result.ticket.resolved_at &&
              ` · Resolved ${new Date(result.ticket.resolved_at).toLocaleString()}`}
          </div>
          {result.comments.length > 0 && (
            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-sm font-medium">Updates</h3>
              {result.comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl p-3 text-sm ${c.is_admin ? "bg-accent/40" : "bg-card border border-border"}`}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {c.author_name} · {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
