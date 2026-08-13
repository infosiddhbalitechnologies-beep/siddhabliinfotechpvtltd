import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminTickets, getAdminStats } from "@/lib/tickets.functions";
import { useState } from "react";
import { Search, Ticket as TicketIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin · Tickets — SIDDHBALI TECHNOLOGIES" }],
  }),
  component: AdminQueue,
});

type Status =
  "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
type Type = "contact" | "career" | "enquiry" | "it_support";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-yellow-500/20 text-yellow-300",
  waiting_on_user: "bg-orange-500/20 text-orange-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-gray-500/20 text-gray-300",
};

function AdminQueue() {
  const list = useServerFn(listAdminTickets);
  const stats = useServerFn(getAdminStats);
  const [status, setStatus] = useState<Status | "">("");
  const [type, setType] = useState<Type | "">("");
  const [q, setQ] = useState("");

  const filters = {
    status: status || undefined,
    type: type || undefined,
    q: q || undefined,
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-tickets", filters],
    queryFn: () => list({ data: filters as any }),
    retry: false,
  });
  const { data: counts } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => stats(),
    retry: false,
  });

  if (isError) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">
          Admin access required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-display font-bold">
          Admin · Ticket Queue
        </h1>
        <Link
          to="/admin-chats"
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          View Chat Conversations →
        </Link>
      </div>

      {counts && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {(
            [
              "total",
              "open",
              "in_progress",
              "waiting_on_user",
              "resolved",
              "closed",
              "contact",
              "career",
              "enquiry",
              "it_support",
            ] as const
          )
            .filter((k) => k in counts)
            .map((k) => (
              <div key={k} className="glass rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {k.replace("_", " ")}
                </div>
                <div className="text-2xl font-display font-bold">
                  {counts[k] ?? 0}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="mt-6 glass rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground block mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Subject, ticket #, email…"
              className="w-full h-10 rounded-lg bg-card border border-border pl-10 pr-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "")}
            className="h-10 rounded-lg bg-card border border-border px-3 text-sm"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="waiting_on_user">Waiting on user</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Type | "")}
            className="h-10 rounded-lg bg-card border border-border px-3 text-sm"
          >
            <option value="">All</option>
            <option value="contact">Contact</option>
            <option value="career">Career</option>
            <option value="enquiry">Enquiry</option>
            <option value="it_support">IT Support</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto glass rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Ticket</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Subject</th>
              <th className="text-left p-3">From</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {data?.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/40 hover:bg-accent/30"
              >
                <td className="p-3">
                  <Link
                    to="/admin/$ticketId"
                    params={{ ticketId: t.id }}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <TicketIcon className="size-3.5" /> {t.ticket_number}
                  </Link>
                </td>
                <td className="p-3 capitalize">{t.type}</td>
                <td className="p-3 max-w-[280px] truncate">{t.subject}</td>
                <td className="p-3">
                  <div>{t.contact_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.contact_email}
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_COLORS[t.status]}`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-3 capitalize">{t.priority}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!isLoading && data?.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  No tickets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
