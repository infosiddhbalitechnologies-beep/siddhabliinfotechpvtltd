import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTicketDetail,
  addComment,
  updateTicket,
  listAdmins,
} from "@/lib/tickets.functions";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$ticketId")({
  head: () => ({
    meta: [{ title: "Admin · Ticket — SIDDHBALI TECHNOLOGIES" }],
  }),
  component: AdminTicket,
});

function AdminTicket() {
  const { ticketId } = Route.useParams();
  const fetchDetail = useServerFn(getTicketDetail);
  const update = useServerFn(updateTicket);
  const reply = useServerFn(addComment);
  const fetchAdmins = useServerFn(listAdmins);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchDetail({ data: { id: ticketId } }),
  });
  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: () => fetchAdmins(),
  });

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const setStatus = async (status: any) => {
    await update({ data: { id: ticketId, status } });
    qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success("Status updated");
  };
  const setPriority = async (priority: any) => {
    await update({ data: { id: ticketId, priority } });
    qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    toast.success("Priority updated");
  };
  const assign = async (val: string) => {
    await update({ data: { id: ticketId, assigned_to: val || null } });
    qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    toast.success(val ? "Assigned" : "Unassigned");
  };
  const postReply = async () => {
    if (!body.trim()) return;
    try {
      await reply({
        data: { ticket_id: ticketId, body, is_internal: internal },
      });
      setBody("");
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success(internal ? "Internal note added" : "Reply posted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  if (isLoading)
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  if (!data) return null;
  const t = data.ticket;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to queue
      </Link>

      <div className="mt-4 grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="text-xs text-muted-foreground">
              {t.ticket_number} · {t.type}
            </div>
            <h1 className="mt-1 text-2xl font-display font-bold">
              {t.subject}
            </h1>
            <div className="mt-2 text-sm text-muted-foreground">
              From <span className="text-foreground">{t.contact_name}</span> ·{" "}
              {t.contact_email}
              {t.company && <> · {t.company}</>}
              {t.contact_phone && <> · {t.contact_phone}</>}
            </div>
            <p className="mt-4 text-sm whitespace-pre-wrap">{t.message}</p>
            {t.details && Object.keys(t.details).length > 0 && (
              <pre className="mt-3 text-xs bg-card border border-border rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(t.details, null, 2)}
              </pre>
            )}
          </div>

          <div className="space-y-3">
            {data.comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl p-4 text-sm ${c.is_internal ? "bg-yellow-500/10 border border-yellow-500/30" : c.is_admin ? "glass" : "bg-card border border-border"}`}
              >
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                  {c.is_internal && <Lock className="size-3" />}
                  {c.author_name} · {new Date(c.created_at).toLocaleString()}
                  {c.is_internal && (
                    <span className="text-yellow-400">Internal</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{c.body}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Reply…"
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm"
            />
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />{" "}
                Internal note
              </label>
              <button
                onClick={postReply}
                className="rounded-xl animated-gradient text-white px-4 py-2 text-sm font-medium shadow-elegant hover:opacity-90 transition"
              >
                Post {internal ? "internal note" : "reply"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <label className="text-xs text-muted-foreground block mb-1">
              Status
            </label>
            <select
              value={t.status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_on_user">Waiting on user</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="glass rounded-2xl p-4">
            <label className="text-xs text-muted-foreground block mb-1">
              Priority
            </label>
            <select
              value={t.priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="glass rounded-2xl p-4">
            <label className="text-xs text-muted-foreground block mb-1">
              Assignee
            </label>
            <select
              value={t.assigned_to ?? ""}
              onChange={(e) => assign(e.target.value)}
              className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {admins?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </option>
              ))}
            </select>
          </div>
          <div className="glass rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
            <div>Created {new Date(t.created_at).toLocaleString()}</div>
            <div>Updated {new Date(t.updated_at).toLocaleString()}</div>
            {t.resolved_at && (
              <div>Resolved {new Date(t.resolved_at).toLocaleString()}</div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
