import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTicketDetail,
  addComment,
  updateTicket,
  listAdmins,
  attachTicketFile,
} from "@/lib/tickets.functions";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Lock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/$ticketId")({
  head: () => ({
    meta: [{ title: "Admin · Ticket — SIDDHBALI TECHNOLOGIES" }],
  }),
  component: AdminTicket,
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function AdminTicket() {
  const { ticketId } = Route.useParams();
  const fetchDetail = useServerFn(getTicketDetail);
  const update = useServerFn(updateTicket);
  const reply = useServerFn(addComment);
  const fetchAdmins = useServerFn(listAdmins);
  const attach = useServerFn(attachTicketFile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchDetail({ data: { id: ticketId } }),
  });
  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: () => fetchAdmins(),
  });
  // TEMP DEBUG — remove after root cause is found. Cross-checks what the
  // browser actually received from listAdmins() against the server logs.
  console.log("[admin.$ticketId] admins received by client:", admins);

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

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
    try {
      await update({ data: { id: ticketId, assigned_to: val || null } });
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success(val ? "Assigned" : "Unassigned");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update assignee");
    }
  };

  const onImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    // Reset the input value so selecting the exact same file again later
    // (e.g. after removing it) still fires this handler.
    e.target.value = "";
    const accepted: File[] = [];
    for (const file of picked) {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" is larger than 5 MB and was not added.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) setImages((prev) => [...prev, ...accepted]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const postReply = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      // addComment() only returns { ok: true } — it never returns the new
      // comment's id, and tickets.functions.ts is not modified here. To
      // link any selected images to this specific reply/internal note (via
      // comment_id), we re-fetch the ticket detail immediately after
      // posting and take the last comment in the (ascending,
      // created_at-ordered) list as the one that was just created.
      await reply({
        data: { ticket_id: ticketId, body, is_internal: internal },
      });
      toast.success(internal ? "Internal note added" : "Reply posted");

      if (images.length > 0) {
        const fresh = await fetchDetail({ data: { id: ticketId } });
        const newCommentId =
          fresh.comments[fresh.comments.length - 1]?.id ?? null;

        if (!newCommentId) {
          toast.error(
            "Posted, but couldn't determine the comment ID — images were not attached.",
          );
        } else {
          let failedCount = 0;
          for (let i = 0; i < images.length; i++) {
            const file = images[i];
            setUploadProgress({ current: i + 1, total: images.length });
            try {
              const storagePath = `${ticketId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
              const { error: uploadError } = await supabase.storage
                .from("ticket-attachments")
                .upload(storagePath, file, { contentType: file.type });
              if (uploadError) throw uploadError;

              await attach({
                data: {
                  ticket_id: ticketId,
                  comment_id: newCommentId,
                  storage_path: storagePath,
                  file_name: file.name,
                  mime_type: file.type,
                  size_bytes: file.size,
                },
              });
            } catch (uploadErr: any) {
              failedCount++;
              toast.error(
                `Couldn't attach "${file.name}": ${uploadErr?.message ?? "upload failed"}`,
              );
            }
          }
          setUploadProgress(null);
          if (failedCount === 0) {
            toast.success(
              images.length === 1 ? "Image attached" : "Images attached",
            );
          } else {
            toast.error(
              `${failedCount} of ${images.length} image(s) couldn't be attached.`,
            );
          }
        }
      }

      setBody("");
      setImages([]);
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setPosting(false);
      setUploadProgress(null);
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

  // Attachments returned by getTicketDetail() are already scoped by RLS
  // (ticket owner or admin only, and internal-note attachments are
  // admin-only at the database level), so as an admin every attachment
  // returned here is already something this viewer is allowed to see.
  const attachments = data.attachments ?? [];
  const commentsById = new Map(data.comments.map((c) => [c.id, c]));
  const ticketAttachments = attachments.filter((a) => a.comment_id === null);
  const commentAttachments = (commentId: string) =>
    attachments.filter((a) => a.comment_id === commentId);

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
            {ticketAttachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ticketAttachments.map((a) => (
                  <AttachmentThumb key={a.id} attachment={a} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {data.comments.map((c) => {
              const atts = commentAttachments(c.id);
              return (
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
                  {atts.length > 0 && (
                    <div className="mt-3">
                      {c.is_internal && (
                        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-yellow-400">
                          <Lock className="size-3" /> Internal attachment —
                          admins only
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {atts.map((a) => (
                          <AttachmentThumb key={a.id} attachment={a} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="glass rounded-2xl p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              disabled={posting}
              placeholder="Reply…"
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm disabled:opacity-60"
            />

            <div className="mt-3">
              <label
                className={`flex items-center gap-2 w-fit rounded-lg border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition ${posting ? "opacity-60 pointer-events-none" : ""}`}
              >
                <ImagePlus className="size-4" />
                Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={posting}
                  onChange={onImagesSelected}
                  className="hidden"
                />
              </label>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Up to 5 MB per image. You can attach more than one.
              </p>

              {images.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {images.map((file, i) => (
                    <li
                      key={`${file.name}-${file.size}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-card border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {file.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={posting}
                        onClick={() => removeImage(i)}
                        aria-label={`Remove ${file.name}`}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={internal}
                  disabled={posting}
                  onChange={(e) => setInternal(e.target.checked)}
                />{" "}
                Internal note
              </label>
              <button
                onClick={postReply}
                disabled={posting}
                className="rounded-xl animated-gradient text-white px-4 py-2 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
              >
                {posting
                  ? uploadProgress
                    ? `Uploading image ${uploadProgress.current} of ${uploadProgress.total}…`
                    : "Posting…"
                  : `Post ${internal ? "internal note" : "reply"}`}
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
