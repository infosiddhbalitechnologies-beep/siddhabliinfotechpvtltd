import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { SERVICES, COMPANY } from "@/lib/site-data";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "IT support & service desk, software development, web & application development, AI & data solutions, automation, graphic design, research & technical writing, and ticket management.",
      },
      { property: "og:title", content: "Services — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content: "The eight services SIDDHBALI TECHNOLOGIES provides.",
      },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const engagement = [
  {
    t: "Project delivery",
    d: "A defined scope with agreed milestones, delivered end to end.",
  },
  {
    t: "Dedicated support",
    d: "Ongoing capacity for maintenance, enhancements and IT support.",
  },
  {
    t: "Consulting & review",
    d: "Short engagements for review, audits and technical documentation.",
  },
];

function ServicesPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-medium text-primary">Services</p>
          <h1
            className="mt-2 font-display font-bold leading-tight"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
          >
            Everything you need to{" "}
            <span className="gradient-text">build, run and support</span> your
            technology
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {COMPANY} works across eight service areas. Engagements can be a
            single service or a combination — most clients start with one
            problem and expand from there.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <Link
              key={s.id}
              to="/services"
              hash={s.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-primary/50 hover:bg-accent/40 transition"
            >
              <s.Icon className="size-4 text-primary" /> {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="space-y-8">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.04}>
              <div
                id={s.id}
                className="scroll-mt-28 glass rounded-3xl p-6 sm:p-10"
              >
                <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <div className="size-12 rounded-xl animated-gradient grid place-items-center text-white neon-glow">
                      <s.Icon className="size-6" />
                    </div>
                    <h2 className="mt-4 text-2xl sm:text-3xl font-display font-bold">
                      {s.name}
                    </h2>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {s.summary}
                    </p>
                    <Link
                      to="/contact"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Discuss this service <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {s.highlights.map((h) => (
                      <div
                        key={h}
                        className="rounded-2xl border border-border bg-card/50 p-5"
                      >
                        <h3 className="font-medium flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />{" "}
                          {h}
                        </h3>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Engagement models</p>
          <h2 className="mt-2 text-3xl font-display font-bold">
            Ways to work with us
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {engagement.map((e, i) => (
            <Reveal key={e.t} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-6">
                <h3 className="font-display font-semibold text-lg">{e.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {e.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <Reveal>
          <div className="glass rounded-3xl p-10">
            <h2 className="text-3xl font-display font-bold">
              Not sure which service you need?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Describe the problem and we'll tell you what's actually required —
              including if it's less than you expected.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              Talk to us <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
