import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Phone,
  Mail,
  MapPin,
  TicketCheck,
  ShieldCheck,
  Users,
  Layers,
  Timer,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import {
  SERVICES,
  COMPANY,
  PHONE,
  PHONE_TEL,
  EMAIL,
  ADDRESS_LINES,
} from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "SIDDHBALI TECHNOLOGIES — Technology Solutions Built for Real Business",
      },
      {
        name: "description",
        content:
          "IT support, software development, web & application development, AI & data solutions, automation, graphic design, research & technical writing, and ticket management — delivered by SIDDHBALI TECHNOLOGIES, Gorakhpur, India.",
      },
      {
        property: "og:title",
        content:
          "SIDDHBALI TECHNOLOGIES — Technology Solutions Built for Real Business",
      },
      {
        property: "og:description",
        content:
          "A technology services company delivering IT support, software, AI & data, automation, design and research for growing organizations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const approach = [
  {
    n: "01",
    t: "Understand",
    d: "We start with your workflow, constraints and the outcome you actually need — not a template.",
  },
  {
    n: "02",
    t: "Design",
    d: "A clear scope, architecture and delivery plan, agreed before a line of code is written.",
  },
  {
    n: "03",
    t: "Build",
    d: "Incremental delivery with working software you can review at every stage.",
  },
  {
    n: "04",
    t: "Test",
    d: "Structured manual and functional testing so issues are found before release.",
  },
  {
    n: "05",
    t: "Support",
    d: "Deployment, monitoring and ongoing support through our IT Service Desk.",
  },
];

const whyUs = [
  {
    Icon: Users,
    t: "Direct engineering access",
    d: "You work with the people building your system — no layers between you and delivery.",
  },
  {
    Icon: Layers,
    t: "Broad technical coverage",
    d: "Software, web, AI & data, automation, design and documentation under one team.",
  },
  {
    Icon: Timer,
    t: "Transparent delivery",
    d: "Defined scope, agreed milestones and honest timelines from the first conversation.",
  },
  {
    Icon: ShieldCheck,
    t: "Tracked support",
    d: "Every request becomes a ticket with a reference ID you can follow to resolution.",
  },
];

function HeroVisual() {
  return (
    <div className="relative aspect-square w-full max-w-[420px] mx-auto">
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full border border-primary/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary))]" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-[12%] rounded-full border border-primary/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{ transform: "rotateX(60deg)" }}
      >
        <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)]" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-[26%] rounded-full border border-border"
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.9)]" />
      </motion.div>
      <motion.div
        className="absolute inset-[36%] rounded-3xl animated-gradient neon-glow"
        animate={{ y: [-8, 8, -8], rotate: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="glass rounded-2xl px-4 py-3 text-center">
          <div className="text-xs uppercase tracking-widest text-primary">
            Engineering
          </div>
          <div className="text-sm font-display font-semibold">
            Software · AI · Data · Automation
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_420px] items-center">
          <Reveal>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> Software
                services company · Gorakhpur, India
              </span>
              <h1
                className="mt-5 font-display font-bold leading-[1.05]"
                style={{ fontSize: "clamp(2.5rem, 4.6vw, 4.25rem)" }}
              >
                Technology Solutions{" "}
                <span className="gradient-text">Built for Real Business</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                {COMPANY} designs, builds and supports practical technology —
                software, AI automation, web applications, AI and data
                solutions, and IT support — for organizations that need work
                delivered properly, not promised loudly.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
                >
                  Start a project <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-medium hover:bg-accent/40 transition"
                >
                  Explore services
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-medium hover:bg-accent/40 transition"
                >
                  <TicketCheck className="size-4 text-primary" /> Track a ticket
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {[
                  "Clear scope",
                  "Working software at every stage",
                  "Ongoing support",
                ].map((f) => (
                  <span key={f} className="inline-flex items-center gap-2">
                    <Check className="size-4 text-primary" /> {f}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* What we do */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">What we do</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold">
            Eight services, one accountable team
          </h2>
          <p className="mt-4 text-muted-foreground">
            From IT support to AI and data work, everything is delivered by
            people you can reach directly.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.05}>
              <Link
                to="/services"
                hash={s.id}
                className="group block h-full glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-elegant transition"
              >
                <div className="size-11 rounded-xl animated-gradient grid place-items-center text-white neon-glow">
                  <s.Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display font-semibold text-lg">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {s.summary}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Learn more{" "}
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Approach */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">How we work</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold">
            A straightforward delivery process
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {approach.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-6">
                <div className="text-xs font-mono text-primary">{s.n}</div>
                <h3 className="mt-2 font-display font-semibold text-lg">
                  {s.t}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {s.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
          <Reveal>
            <p className="text-sm font-medium text-primary">Why work with us</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold">
              A young company, built on engineering discipline
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {COMPANY} is an early-stage technology services company. We're
              deliberately transparent about that: what we offer is senior
              attention, clear communication and work delivered the way we said
              we'd deliver it.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {whyUs.map((w, i) => (
              <Reveal key={w.t} delay={i * 0.05}>
                <div className="h-full glass rounded-2xl p-6">
                  <w.Icon className="size-5 text-primary" />
                  <h3 className="mt-3 font-medium">{w.t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {w.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* IT Service Desk */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <div className="glass rounded-3xl p-8 sm:p-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-center">
            <div>
              <p className="text-sm font-medium text-primary">
                IT Service Desk
              </p>
              <h2 className="mt-2 text-3xl font-display font-bold">
                Support requests, tracked properly
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Every enquiry, business request, career application and support
                issue is logged in our service desk with a unique ticket
                reference. You can track its status at any time, and our team
                works the queue by priority.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-5 py-2.5 text-sm font-medium shadow-elegant hover:opacity-90 transition"
                >
                  Raise a request
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-2.5 text-sm font-medium hover:bg-accent/40 transition"
                >
                  <TicketCheck className="size-4 text-primary" /> Track existing
                  ticket
                </Link>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Unique ticket ID for every request",
                "Status updates from open to resolved",
                "Comment thread with our team",
                "Dashboard for all your tickets",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <Reveal>
          <div className="glass rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Tell us what you're building
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              Share the problem you're trying to solve and we'll tell you
              honestly whether we're the right team for it.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 text-sm max-w-3xl mx-auto">
              <a
                href={`tel:${PHONE_TEL}`}
                className="rounded-2xl border border-border bg-card/50 p-5 hover:border-primary/40 transition"
              >
                <Phone className="size-4 text-primary mx-auto" />
                <div className="mt-2 font-medium">{PHONE}</div>
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="rounded-2xl border border-border bg-card/50 p-5 hover:border-primary/40 transition break-words"
              >
                <Mail className="size-4 text-primary mx-auto" />
                <div className="mt-2 font-medium">{EMAIL}</div>
              </a>
              <div className="rounded-2xl border border-border bg-card/50 p-5">
                <MapPin className="size-4 text-primary mx-auto" />
                <div className="mt-2 text-muted-foreground">
                  {ADDRESS_LINES.join(", ")}
                </div>
              </div>
            </div>
            <Link
              to="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              Contact us <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
