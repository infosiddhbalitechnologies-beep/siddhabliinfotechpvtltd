import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTicketDetail } from "@/lib/tickets.functions";
import {
  ArrowLeft,
  Ticket as TicketIcon,
  User,
  Mail,
  Clock,
  CheckCircle2,
  Paperclip,
  History,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket details — SIDDHBALI TECHNOLOGIES" }] }),
  component: MyTicketDetail,
});

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-yellow-500/20 text-yellow-300",
  waiting_on_user: "bg-orange-500/20 text-orange-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-gray-500/20 text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-300",
  normal: "bg-blue-500/20 text-blue-300",
  high: "bg-orange-500/20 text-orange-300",
  urgent: "bg-red-500/20 text-red-300",
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function displayValue(value: unknown, fallback = "Not provided") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return String(value);
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm break-words">{value}</div>
    </div>
  );
}

function AttachmentThumb({
  attachment,
}: {
  attachment: {
    id: string;
    file_name: string;
    mime_type: string;
    url: string | null;
  };
}) {
  const isImage = attachment.mime_type.startsWith("image/");
  return (
    <a
      href={attachment.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg overflow-hidden border border-border bg-card hover:opacity-90 transition"
    >
      {isImage && attachment.url ? (
        <img
          src={attachment.url}
          alt={attachment.file_name}
          className="w-full h-28 object-cover"
        />
      ) : (
        <div className="p-3 text-xs truncate">{attachment.file_name}</div>
      )}
    </a>
  );
}

function MyTicketDetail() {
  const { ticketId } = Route.useParams();
  const fetchDetail = useServerFn(getTicketDetail);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchDetail({ data: { id: ticketId } }),
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to My Tickets
        </Link>
        <div className="mt-6 glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          This ticket couldn't be found, or you don't have access to it.
        </div>
      </section>
    );
  }

  const t = data.ticket;
  const attachments = data.attachments ?? [];
  const ticketAttachments = attachments.filter((a) => a.comment_id === null);
  const commentAttachments = (commentId: string) =>
    attachments.filter((a) => a.comment_id === commentId);
  const history = data.history ?? [];
  const assignedAdmin = data.assignedAdmin;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to My Tickets
      </Link>

      <div className="mt-4 grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TicketIcon className="size-3.5" /> {t.ticket_number} ·{" "}
              {formatLabel(t.type)}
              {t.category && <> · {t.category}</>}
            </div>
            <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">{t.subject}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-md ${PRIORITY_COLORS[t.priority] ?? "bg-gray-500/20 text-gray-300"}`}
                >
                  {formatLabel(t.priority)} priority
                </span>
              </div>
            </div>

            {/* Original message */}
            <div className="mt-5 rounded-xl bg-card border border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Original message
              </div>
              <p className="text-sm whitespace-pre-wrap">{t.message}</p>
            </div>

            {ticketAttachments.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Paperclip className="size-3.5" /> Attachments
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ticketAttachments.map((a) => (
                    <AttachmentThumb key={a.id} attachment={a} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ticket information — all fields from the tickets table */}
          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">
              Ticket information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoField label="Ticket number" value={displayValue(t.ticket_number)} />
              <InfoField label="Type" value={displayValue(t.type && formatLabel(t.type))} />
              <InfoField label="Status" value={displayValue(t.status && formatLabel(t.status))} />
              <InfoField label="Priority" value={displayValue(t.priority && formatLabel(t.priority))} />
              <InfoField label="Category" value={displayValue(t.category)} />
              <InfoField label="Industry" value={displayValue(t.industry)} />
              <InfoField label="Contact name" value={displayValue(t.contact_name)} />
              <InfoField label="Contact email" value={displayValue(t.contact_email)} />
              <InfoField label="Contact phone" value={displayValue(t.contact_phone)} />
              <InfoField label="Company" value={displayValue(t.company)} />
              <InfoField
                label="Assigned to"
                value={
                  assignedAdmin
                    ? assignedAdmin.full_name || assignedAdmin.email || "Assigned"
                    : "Not assigned"
                }
              />
              <InfoField label="Submitted by" value={displayValue(t.submitted_by, "Not provided")} />
              <InfoField
                label="Created at"
                value={displayValue(t.created_at && new Date(t.created_at).toLocaleString())}
              />
              <InfoField
                label="Updated at"
                value={displayValue(t.updated_at && new Date(t.updated_at).toLocaleString())}
              />
              <InfoField
                label="Resolved at"
                value={
                  t.resolved_at
                    ? new Date(t.resolved_at).toLocaleString()
                    : "Not resolved yet"
                }
              />
            </div>
          </div>

          {/* Additional details (JSON) */}
          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Additional details
            </div>
            {t.details && Object.keys(t.details).length > 0 ? (
              <pre className="text-xs bg-card border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(t.details, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">Not provided</div>
            )}
          </div>

          {/* Conversation timeline */}
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 px-1">
              <MessageSquare className="size-3.5" /> Conversation
            </div>
            <div className="space-y-3">
              {data.comments.length === 0 && (
                <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  No replies yet.
                </div>
              )}
              {data.comments.map((c) => {
                const atts = commentAttachments(c.id);
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 text-sm ${c.is_admin ? "glass" : "bg-card border border-border"}`}
                  >
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {c.author_name}
                      </span>
                      {c.is_admin && (
                        <span className="text-primary">Support team</span>
                      )}
                      <span>· {new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{c.body}</div>
                    {atts.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {atts.map((a) => (
                          <AttachmentThumb key={a.id} attachment={a} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status history */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 px-1">
                <History className="size-3.5" /> Status timeline
              </div>
              <div className="glass rounded-2xl p-4 space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="text-xs text-muted-foreground">
                    <span className="text-foreground">
                      {h.from_status
                        ? `${formatLabel(h.from_status)} → ${formatLabel(h.to_status ?? "")}`
                        : formatLabel(h.to_status ?? "")}
                    </span>
                    <span> · {new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Assigned to
            </div>
            {assignedAdmin ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="size-3.5 text-primary" />
                  <span>{assignedAdmin.full_name || "Support agent"}</span>
                </div>
                {assignedAdmin.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3.5" />
                    <span>{assignedAdmin.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Not yet assigned
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-4 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="size-3.5" />
              <span>Created {new Date(t.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-3.5" />
              <span>Updated {new Date(t.updated_at).toLocaleString()}</span>
            </div>
            {t.resolved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-green-400" />
                <span>
                  Resolved {new Date(t.resolved_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
