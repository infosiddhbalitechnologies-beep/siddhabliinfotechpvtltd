import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEnquiry } from "@/lib/tickets.functions";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({ role: z.string().optional() });

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Apply to join SIDDHBALI TECHNOLOGIES. Submit your application and track its status.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ApplyPage,
});

function ApplyPage() {
  const { role } = useSearch({ from: "/apply" });
  const submit = useServerFn(submitEnquiry);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: role ?? "",
    years: "",
    linkedin: "",
    resume_url: "",
    cover: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ enquiry_number: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submit({
        data: {
          type: "career",
          subject: `Application: ${form.role}`,
          message: form.cover || `Application for ${form.role}`,
          contact_name: form.name,
          contact_email: form.email,
          contact_phone: form.phone || undefined,
          details: {
            role: form.role,
            years_experience: form.years,
            linkedin: form.linkedin,
            resume_url: form.resume_url,
          },
        },
      });
      setDone({ enquiry_number: res.enquiry_number });
      toast.success(`Application received — ${res.enquiry_number}`);
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-medium text-primary">Careers</p>
      <h1 className="mt-2 text-4xl font-display font-bold">
        Apply to SIDDHBALI TECHNOLOGIES
      </h1>
      <p className="mt-3 text-muted-foreground">
        Submit your application — you'll get an enquiry number to track its
        status.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 glass rounded-2xl p-6 space-y-4"
      >
        <Row>
          <In
            label="Full name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <In
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
        </Row>
        <Row>
          <In
            label="Phone"
            required={false}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <In
            label="Role applying for"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v })}
          />
        </Row>
        <Row>
          <In
            label="Years of experience"
            required={false}
            value={form.years}
            onChange={(v) => setForm({ ...form, years: v })}
          />
          <In
            label="LinkedIn URL"
            required={false}
            value={form.linkedin}
            onChange={(v) => setForm({ ...form, linkedin: v })}
          />
        </Row>
        <In
          label="Resume URL (Google Drive / Dropbox)"
          required={false}
          value={form.resume_url}
          onChange={(v) => setForm({ ...form, resume_url: v })}
        />
        <div>
          <label className="text-sm font-medium block mb-1.5">Cover note</label>
          <textarea
            rows={5}
            required
            value={form.cover}
            onChange={(e) => setForm({ ...form, cover: e.target.value })}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm"
          />
        </div>
        <button
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit application"}{" "}
          <Send className="size-4" />
        </button>
        {done && (
          <div className="rounded-xl border border-primary/30 bg-accent/30 p-4 text-sm">
            <div>
              Application received as{" "}
              <span className="text-primary font-medium">
                {done.enquiry_number}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground">
              <Link to="/track" className="text-primary hover:underline">
                Track status
              </Link>{" "}
              ·{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Sign up to manage all applications
              </Link>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}
function In({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
      />
    </div>
  );
}