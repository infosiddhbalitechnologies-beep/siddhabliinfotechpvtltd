import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTicketDetail, addComment } from "@/lib/tickets.functions";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket — SIDDHBALI TECHNOLOGIES" }] }),
  component: TicketDetail,
});

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const fetchDetail = useServerFn(getTicketDetail);
  const reply = useServerFn(addComment);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchDetail({ data: { id: ticketId } }),
  });
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const postReply = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await reply({ data: { ticket_id: ticketId, body, is_internal: false } });
      setBody("");
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success("Reply posted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  if (!data) return null;
  const t = data.ticket;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my tickets
      </Link>
      <div className="mt-4 glass rounded-2xl p-6">
        <div className="text-xs text-muted-foreground">
          {t.ticket_number} · {t.type} · {t.priority}
        </div>
        <h1 className="mt-1 text-2xl font-display font-bold">{t.subject}</h1>
        <div className="mt-2 inline-block text-xs font-medium px-2 py-1 rounded-md bg-accent/40">
          {t.status.replace("_", " ")}
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap">{t.message}</p>
      </div>

      <div className="mt-6 space-y-3">
        {data.comments
          .filter((c) => !c.is_internal)
          .map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl p-4 text-sm ${c.is_admin ? "glass" : "bg-card border border-border"}`}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {c.author_name} · {new Date(c.created_at).toLocaleString()}
              </div>
              <div className="whitespace-pre-wrap">{c.body}</div>
            </div>
          ))}
      </div>

      <div className="mt-6 glass rounded-2xl p-4">
        <label className="text-sm font-medium block mb-2">Add a reply</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm"
        />
        <button
          onClick={postReply}
          disabled={posting}
          className="mt-3 rounded-xl animated-gradient text-white px-4 py-2 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
        >
          {posting ? "Posting…" : "Post reply"}
        </button>
      </div>
    </section>
  );
}
