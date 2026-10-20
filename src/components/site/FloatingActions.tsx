import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Plus,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { submitEnquiry } from "@/lib/tickets.functions";
import { cn } from "@/lib/utils";

export const WHATSAPP_NUMBER = "918423675645";
export const PHONE_DISPLAY = "+91 84236 75645";

export function openRequestCallModal() {
  window.dispatchEvent(new CustomEvent("siddh:open-request-call"));
}

export function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setCallOpen(true);
      setOpen(false);
    };
    window.addEventListener("siddh:open-request-call", handler);
    return () => window.removeEventListener("siddh:open-request-call", handler);
  }, []);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col items-end gap-2.5">
            <FabItem
              label="Chat with AI Assistant"
              Icon={Bot}
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("siddh:open-chat"));
              }}
            />
            <FabItem
              label="Chat on WhatsApp"
              Icon={MessageSquare}
              onClick={() => {
                setOpen(false);
                window.open(
                  `https://wa.me/${WHATSAPP_NUMBER}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            />
            <FabItem
              label="Request a Call"
              Icon={PhoneCall}
              onClick={() => {
                setOpen(false);
                setCallOpen(true);
              }}
            />
          </div>
        )}

        <button
          type="button"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {callOpen && <RequestCallModal onClose={() => setCallOpen(false)} />}
    </>
  );
}

function FabItem({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: any;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 rounded-full border border-border bg-background/95 py-2 pl-3 pr-4 text-sm font-medium shadow-xl backdrop-blur transition hover:bg-accent"
    >
      <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function RequestCallModal({ onClose }: { onClose: () => void }) {
  // "Request a Call" is a public message/enquiry action, not an IT support
  // ticket — anyone (guest or signed in) can use it, so it must go through
  // submitEnquiry (no auth required) rather than submitTicket (which is
  // reserved for authenticated IT support tickets only).
  const submit = useServerFn(submitEnquiry);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    time: "",
    message: "",
  });

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submit({
        data: {
          type: "call_back" as const,
          subject: `Call request from ${form.name}`,
          message: form.message?.trim()
            ? form.message
            : `Call back requested. Preferred time: ${form.time || "any"}.`,
          contact_name: form.name,
          contact_email: form.email,
          contact_phone: form.phone,
          company: form.company || undefined,
          details: {
            request_type: "call_back",
            preferred_call_time: form.time,
          },
        },
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request a call"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-primary" />
            <h3 className="mt-4 text-xl font-display font-bold">Thank you.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Our team will contact you as soon as possible.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl animated-gradient px-6 py-2.5 text-sm font-medium text-white shadow-elegant hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h3 className="text-xl font-display font-bold">Request a Call</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your details and we'll call you back.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField
                label="Full Name"
                value={form.name}
                maxLength={120}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <ModalField
                label="Company Name (optional)"
                required={false}
                value={form.company}
                maxLength={150}
                onChange={(v) => setForm({ ...form, company: v })}
              />
              <ModalField
                label="Mobile Number"
                type="tel"
                value={form.phone}
                maxLength={20}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <ModalField
                label="Email Address"
                type="email"
                value={form.email}
                maxLength={200}
                onChange={(v) => setForm({ ...form, email: v })}
              />
            </div>
            <ModalField
              label="Preferred Call Time"
              placeholder="e.g. Weekdays 10 AM – 1 PM"
              value={form.time}
              maxLength={100}
              onChange={(v) => setForm({ ...form, time: v })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Purpose / Message
              </label>
              <textarea
                rows={4}
                required
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us briefly what you'd like to discuss…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl animated-gradient px-6 py-2.5 text-sm font-medium text-white shadow-elegant hover:opacity-90 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="size-4 animate-spin" />} Submit
                Request
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-accent transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ModalField({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
