import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, LifeBuoy, ImagePlus, X } from "lucide-react";
import { submitTicket, attachTicketFile } from "@/lib/tickets.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// This route lives under `_authenticated`, so TanStack Router's
// `_authenticated` layout `beforeLoad` + component-level guard already
// redirect signed-out visitors to `/auth?redirect=/raise-ticket` before
// this page ever renders. The submission itself goes through the
// existing `submitTicket` server function, which requires a valid
// Supabase session and always derives the ticket owner from that
// session (`submitted_by = context.userId`), never from anything sent
// by the client.
export const Route = createFileRoute("/raise-ticket")({
  head: () => ({
    meta: [{ title: "Raise a Ticket — SIDDHBALI TECHNOLOGIES" }],
  }),
  component: RaiseTicket,
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function RaiseTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const submit = useServerFn(submitTicket);
  const attach = useServerFn(attachTicketFile);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({
    subject: "",
    message: "",
    contact_name: "",
    contact_email: user?.email ?? "",
    contact_phone: "",
    company: "",
  });

  // useAuth() loads asynchronously and can still be null on first render
  // even though the route is already known to be authenticated (the
  // `_authenticated` layout verified the session before this component
  // ever mounted) — backfill the email field once it resolves.
  useEffect(() => {
    if (user?.email && !form.contact_email) {
      setForm((f) => ({ ...f, contact_email: user.email }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Pre-flight check: the page's own auth state (`user` above) was
      // resolved when this component mounted and can go stale — the
      // access token can expire, or the session can be cleared in
      // another tab, while this form sits open. Re-verify the *live*
      // session immediately before firing an authenticated action, so a
      // lapsed session produces a clear "please sign in again" redirect
      // instead of a raw server error after the form was already filled
      // out. This does not weaken auth in any way — submitTicket and
      // auth-middleware.ts still perform the real, authoritative check
      // server-side; this only improves what happens on the client when
      // that check would fail.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Your session has expired. Please sign in again.");
        navigate({
          to: "/auth",
          search: { redirect: "/raise-ticket" },
        });
        return;
      }

      // Ticket creation itself is unchanged — this call, and everything
      // it does, is identical to before the image-attachment feature.
      const row = await submit({
        data: {
          type: "it_support",
          subject: form.subject,
          message: form.message,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || undefined,
          company: form.company || undefined,
        },
      });
      toast.success(`Ticket ${row.ticket_number} created`);

      // Only after the ticket exists do we attempt to upload any selected
      // images — this call only ever happens once per submit, so the
      // ticket itself is never created twice even if an image later
      // fails to upload.
      if (images.length > 0) {
        let failedCount = 0;
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          setUploadProgress({ current: i + 1, total: images.length });
          try {
            const storagePath = `${row.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
            const { error: uploadError } = await supabase.storage
              .from("ticket-attachments")
              .upload(storagePath, file, { contentType: file.type });
            if (uploadError) throw uploadError;

            // No comment_id here — these are attachments on the ticket
            // itself at creation time, not on a specific reply.
            await attach({
              data: {
                ticket_id: row.id,
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
            `${failedCount} of ${images.length} image(s) couldn't be attached, but your ticket was created successfully.`,
          );
        }
      }

      navigate({ to: "/dashboard/$ticketId", params: { ticketId: row.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to raise ticket");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my tickets
      </Link>

      <div className="mt-4 glass rounded-2xl p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 grid place-items-center rounded-xl animated-gradient text-white">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Raise a Ticket</h1>
            <p className="text-xs text-muted-foreground">
              Signed in as {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field
            label="Subject"
            placeholder="Short summary of the issue"
            value={form.subject}
            maxLength={200}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Describe the issue
            </label>
            <textarea
              required
              rows={5}
              minLength={5}
              maxLength={5000}
              placeholder="What's happening, what you expected, and any error messages…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Your name"
              placeholder="Full name"
              value={form.contact_name}
              maxLength={120}
              onChange={(e) =>
                setForm({ ...form, contact_name: e.target.value })
              }
            />
            <Field
              label="Contact email"
              type="email"
              placeholder="you@company.com"
              value={form.contact_email}
              maxLength={200}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Phone (optional)"
              type="tel"
              required={false}
              placeholder="Optional"
              value={form.contact_phone}
              maxLength={40}
              onChange={(e) =>
                setForm({ ...form, contact_phone: e.target.value })
              }
            />
            <Field
              label="Company (optional)"
              required={false}
              placeholder="Optional"
              value={form.company}
              maxLength={150}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">
              Screenshots (optional)
            </label>
            <label
              className={`flex items-center gap-2 w-fit rounded-lg border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition ${loading ? "opacity-60 pointer-events-none" : ""}`}
            >
              <ImagePlus className="size-4" />
              Add images
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={loading}
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
                      disabled={loading}
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

          <button
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
          >
            {loading
              ? uploadProgress
                ? `Uploading image ${uploadProgress.current} of ${uploadProgress.total}…`
                : "Submitting…"
              : "Submit ticket"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  required = true,
  ...props
}: {
  label: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <input
        required={required}
        {...props}
        className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}