import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyTickets } from "@/lib/tickets.functions";
import { Ticket as TicketIcon, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My tickets — SIDDHBALI TECHNOLOGIES" }] }),
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-yellow-500/20 text-yellow-300",
  waiting_on_user: "bg-orange-500/20 text-orange-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-gray-500/20 text-gray-300",
};

function Dashboard() {
  const fetchTickets = useServerFn(getMyTickets);
  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchTickets(),
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">My tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track everything you've submitted to SIDDHBALI TECHNOLOGIES.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-4 py-2 text-sm font-medium shadow-elegant hover:opacity-90 transition"
        >
          <Plus className="size-4" /> New ticket
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No tickets yet.{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Submit one
            </Link>
            .
          </div>
        )}
        {data?.map((t) => (
          <Link
            key={t.id}
            to="/dashboard/$ticketId"
            params={{ ticketId: t.id }}
            className="block glass rounded-2xl p-4 hover:shadow-elegant transition"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TicketIcon className="size-3.5" /> {t.ticket_number} ·{" "}
                  {t.type}
                </div>
                <div className="mt-1 font-medium truncate">{t.subject}</div>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_COLORS[t.status]}`}
              >
                {t.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Updated {new Date(t.updated_at).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
