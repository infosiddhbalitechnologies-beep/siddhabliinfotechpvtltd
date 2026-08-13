import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Target,
  Eye,
  Compass,
  ShieldCheck,
  MessageSquare,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { COMPANY, ADDRESS_LINES } from "@/lib/site-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "SIDDHBALI TECHNOLOGIES is a software services company based in Gorakhpur, India — conceptualized in 2024, planned in 2025 and launched in 2026.",
      },
      { property: "og:title", content: "About — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content:
          "Our story, mission and the way we work as a technology services company.",
      },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

const timeline = [
  {
    y: "2024",
    t: "Concept",
    d: "The idea took shape: a technology services company that delivers practical, well-engineered software instead of overpromised projects.",
  },
  {
    y: "2025",
    t: "Planning & Preparation",
    d: "Service structure, delivery process, technical standards and internal systems were designed and put in place.",
  },
  {
    y: "2026",
    t: "Official Launch",
    d: "SIDDHBALI TECHNOLOGIES formally began operations from Gorakhpur, Uttar Pradesh, offering IT support, software and web development, AI and data solutions, automation, design and research services.",
  },
];

const values = [
  {
    Icon: ShieldCheck,
    t: "Honesty over hype",
    d: "We say what we can deliver, and we say when something is outside our scope.",
  },
  {
    Icon: Wrench,
    t: "Engineering discipline",
    d: "Clear architecture, reviewed code, structured testing and documented decisions.",
  },
  {
    Icon: MessageSquare,
    t: "Direct communication",
    d: "You speak with the people doing the work, in plain language, throughout the project.",
  },
  {
    Icon: Compass,
    t: "Long-term thinking",
    d: "We build systems that can be maintained and extended, not just demoed.",
  },
];

function About() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-medium text-primary">About us</p>
          <h1
            className="mt-2 font-display font-bold leading-tight"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
          >
            A technology services company built to{" "}
            <span className="gradient-text">deliver, not to impress</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {COMPANY} provides practical technology solutions for businesses and
            organizations. Our services cover IT support and service desk
            operations, software and web application development, AI and data
            solutions, automation, graphic design, research and technical
            writing, and structured ticket and issue management. We focus on
            building reliable, useful, and scalable technology solutions that
            help organizations improve their digital operations.
          </p>
        </Reveal>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-2 items-start">
          <Reveal>
            <h2 className="text-3xl font-display font-bold">Our story</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The company began as a concept in 2024 — the observation that
                many organizations struggle to find a technology partner who
                scopes work honestly, delivers on schedule and stays available
                after go-live.
              </p>
              <p>
                Through 2025 that concept was turned into a working operation:
                defining service areas, building internal delivery and support
                systems, and setting the technical standards the team works to
                today.
              </p>
              <p>
                In 2026 {COMPANY} officially launched. We are early in our
                journey, and we treat that as a reason to work harder on every
                engagement rather than something to disguise.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass rounded-3xl p-8">
              <h3 className="font-display font-semibold text-lg">
                At a glance
              </h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Company</dt>
                  <dd className="font-medium">{COMPANY}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Founded</dt>
                  <dd className="font-medium">
                    2026 (concept 2024, planning 2025)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Headquarters</dt>
                  <dd className="font-medium">{ADDRESS_LINES.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Focus</dt>
                  <dd className="font-medium">
                    IT support, software &amp; web development, AI &amp; data,
                    automation, design, research &amp; technical writing, ticket
                    management
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              Icon: Target,
              t: "Mission",
              d: "To deliver dependable, well-engineered technology solutions that solve real operational problems for the organizations we work with.",
            },
            {
              Icon: Eye,
              t: "Vision",
              d: "To become a trusted long-term technology partner known for engineering quality, clear communication and consistent delivery.",
            },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-8">
                <div className="size-12 rounded-xl animated-gradient grid place-items-center text-white neon-glow">
                  <b.Icon className="size-6" />
                </div>
                <h3 className="mt-4 text-2xl font-display font-bold">{b.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {b.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <p className="text-sm font-medium text-primary">Our journey</p>
          <h2 className="mt-2 text-3xl font-display font-bold">
            From concept to launch
          </h2>
        </Reveal>
        <div className="mt-10 relative pl-8">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-10">
            {timeline.map((m, i) => (
              <Reveal key={m.y} delay={i * 0.05}>
                <div className="relative">
                  <span className="absolute -left-8 top-1.5 size-3 rounded-full animated-gradient ring-4 ring-background" />
                  <div className="text-sm font-medium text-primary">{m.y}</div>
                  <div className="mt-1 font-display font-bold text-xl">
                    {m.t}
                  </div>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {m.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">How we work</p>
          <h2 className="mt-2 text-3xl font-display font-bold">
            Principles we hold to
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.t} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-6">
                <v.Icon className="size-5 text-primary" />
                <h3 className="mt-3 font-display font-semibold">{v.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {v.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Reveal>
          <div className="glass rounded-3xl p-10">
            <h2 className="text-3xl font-display font-bold">Work with us</h2>
            <p className="mt-3 text-muted-foreground">
              Tell us about your requirement and we'll respond with a clear view
              of scope, approach and timeline.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              Get in touch <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
