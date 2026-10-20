import { createFileRoute } from "@tanstack/react-router";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Handshake,
  FlaskConical,
  Briefcase,
  PhoneCall,
  Clock,
  TicketCheck,
} from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEnquiry } from "@/lib/tickets.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import {
  openRequestCallModal,
  WHATSAPP_NUMBER,
  PHONE_DISPLAY,
} from "@/components/site/FloatingActions";
import { EMAIL, ADDRESS_LINES, MAP_EMBED } from "@/lib/site-data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Contact SIDDHBALI TECHNOLOGIES in Gorakhpur, India for software development, AI automation, cloud, ERP, data and IT support projects.",
      },
      { property: "og:title", content: "Contact — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content:
          "Talk to us about a project, a partnership or technical support.",
      },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const submit = useServerFn(submitEnquiry);
  const [submitted, setSubmitted] = useState<{ enquiry_number: string } | null>(
    null,
  );
  const [inquiry, setInquiry] = useState("business");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const type =
        inquiry === "business" || inquiry === "partnership"
          ? "business"
          : "contact";
      const res = (await submit({
        data: {
          type: type as "contact" | "business",
          subject: `${inquiry} from ${form.name}`,
          message: form.message,
          contact_name: form.name,
          contact_email: form.email,
          company: form.company || undefined,
          details: { inquiry_category: inquiry },
        },
      })) as unknown as {
        id: string;
        enquiry_number: string;
        status: string;
        created_at: string;
      };
      setSubmitted({ enquiry_number: res.enquiry_number });
      toast.success(`Enquiry ${res.enquiry_number} created`);
      setForm({ name: "", email: "", company: "", message: "" });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Reveal>
          <p className="text-sm font-medium text-primary">Contact</p>
          <h1
            className="mt-2 font-display font-bold leading-tight"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
          >
            Tell us what you <span className="gradient-text">need built</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Share your requirement and we'll come back with a clear view of
            scope, approach and timeline. Every message is logged as a ticket
            you can track.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <Reveal className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              className="glass rounded-2xl p-8 space-y-5"
            >
              <h2 className="text-2xl font-display font-bold">
                Send us a message
              </h2>
              <div>
                <label className="text-sm font-medium block mb-2">
                  Inquiry type
                </label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: "business",
                      Icon: Briefcase,
                      t: "Project / business enquiry",
                    },
                    { id: "partnership", Icon: Handshake, t: "Partnership" },
                    {
                      id: "research",
                      Icon: FlaskConical,
                      t: "Research & documentation",
                    },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setInquiry(o.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition ${inquiry === o.id ? "border-primary bg-accent/60 text-foreground neon-glow" : "border-border bg-card hover:bg-accent/40"}`}
                    >
                      <o.Icon className="size-4 text-primary" />
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Field
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <Field
                label="Company / organization"
                placeholder="Optional"
                required={false}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  How can we help?
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe the problem, system or service you need…"
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send message"}{" "}
                  <Send className="size-4" />
                </button>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent transition"
                >
                  <MessageCircle className="size-4 text-primary" /> Chat on
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={openRequestCallModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent transition"
                >
                  <PhoneCall className="size-4 text-primary" /> Request a Call
                </button>
              </div>
              {submitted && (
                <div className="rounded-xl border border-primary/30 bg-accent/30 p-4 text-sm">
                  <div className="font-medium">
                    Thanks — your Reference Number is{" "}
                    <span className="text-primary">
                      {submitted.enquiry_number}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Save this number.{" "}
                    <Link to="/track" className="text-primary hover:underline">
                      Track its status
                    </Link>{" "}
                    any time, or{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      create an account
                    </Link>{" "}
                    to see all your tickets in one place.
                  </div>
                </div>
              )}
            </form>
          </Reveal>

          {/* Info + chat */}
          <Reveal delay={0.1} className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <InfoRow
                Icon={Mail}
                t="Email"
                v={EMAIL}
                href={`mailto:${EMAIL}`}
              />
              <InfoRow
                Icon={Phone}
                t="Phone"
                v={PHONE_DISPLAY}
                href={`tel:+${WHATSAPP_NUMBER}`}
              />
              <InfoRow
                Icon={MessageCircle}
                t="WhatsApp"
                v={PHONE_DISPLAY}
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
              />
              <InfoRow
                Icon={MapPin}
                t="Office Address"
                v={ADDRESS_LINES.join(",\n")}
              />
              <InfoRow
                Icon={Clock}
                t="Working Hours"
                v={"Monday – Saturday\n10:00 AM – 7:00 PM IST"}
              />
            </div>

            {/* Service desk */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="size-10 grid place-items-center rounded-xl animated-gradient text-white">
                  <TicketCheck className="size-5" />
                </div>
                <div>
                  <div className="font-semibold">IT Service Desk</div>
                  <div className="text-xs text-muted-foreground">
                    Already raised a request?
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Every enquiry and support request gets a unique ticket ID. Use
                it to check status, or sign in to see all your tickets in one
                dashboard.
              </p>
              <Link
                to="/track"
                className="mt-5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition flex items-center justify-center gap-2"
              >
                Track a ticket
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Map */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <div className="glass rounded-3xl overflow-hidden">
            <iframe
              title="SIDDHBALI TECHNOLOGIES office location"
              src={MAP_EMBED}
              loading="lazy"
              allowFullScreen
              className="w-full h-[320px] sm:h-[420px] border-0 rounded-2xl"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <input
        required
        {...props}
        className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function InfoRow({
  Icon,
  t,
  v,
  href,
}: {
  Icon: any;
  t: string;
  v: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-10 grid place-items-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {t}
        </div>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="font-medium hover:text-primary transition-colors"
          >
            {v}
          </a>
        ) : (
          <div className="font-medium whitespace-pre-line leading-relaxed">
            {v}
          </div>
        )}
      </div>
    </div>
  );
}