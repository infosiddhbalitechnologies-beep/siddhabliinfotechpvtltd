import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Briefcase, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { COMPANY } from "@/lib/site-data";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Open roles at SIDDHBALI TECHNOLOGIES across IT support, software development, web development, AI & data, automation, design, and research & technical writing.",
      },
      { property: "og:title", content: "Careers — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content:
          "Join a small, early-stage technology services team based in Gorakhpur, India.",
      },
    ],
    links: [{ rel: "canonical", href: "/careers" }],
  }),
  component: Careers,
});

const roles = [
  {
    t: "Software Developer",
    team: "Software Development",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "Web & Application Developer",
    team: "Web & Application Development",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "AI & Data Associate",
    team: "AI & Data Solutions",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "Automation Engineer",
    team: "Automation Solutions",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "Graphic Designer",
    team: "Graphic Design",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "Technical Writer",
    team: "Research & Technical Writing",
    loc: "Gorakhpur / Remote",
    type: "Full-time",
  },
  {
    t: "IT Support Executive",
    team: "IT Support & Service Desk",
    loc: "Gorakhpur",
    type: "Full-time",
  },
];

const values = [
  {
    t: "Honesty over hype",
    d: "We say what we can deliver, and we say when something is outside our scope.",
  },
  {
    t: "Engineering discipline",
    d: "Clear scope, reviewed work and documented decisions on every task.",
  },
  {
    t: "Direct communication",
    d: "A small team means you work closely with the people making decisions.",
  },
];

function Careers() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Reveal>
          <p className="text-sm font-medium text-primary">Careers</p>
          <h1 className="mt-2 text-5xl sm:text-6xl font-display font-bold leading-tight">
            Build with <span className="gradient-text">{COMPANY}</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            We're a young, Gorakhpur-based technology services company. If you'd
            like to be part of building it, here's where to start.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid sm:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <Reveal key={v.t} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-6">
                <h3 className="font-display font-semibold text-lg">{v.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="text-center max-w-xl mx-auto">
          <p className="text-sm font-medium text-primary">Open roles</p>
          <h2 className="mt-2 text-4xl font-display font-bold">
            Where we're hiring
          </h2>
          <p className="mt-3 text-muted-foreground">
            Roles map to our service areas. Don't see an exact fit? Apply anyway
            and tell us what you do.
          </p>
        </Reveal>
        <div className="mt-10 space-y-3">
          {roles.map((r, i) => (
            <Reveal key={r.t} delay={i * 0.03}>
              <Link
                to="/apply"
                search={{ role: r.t }}
                className="group block glass rounded-2xl p-5 hover:shadow-elegant transition"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="size-10 grid place-items-center rounded-xl bg-accent text-primary">
                    <Briefcase className="size-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-display font-semibold">{r.t}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.team}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> {r.loc}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md border border-border">
                    {r.type}
                  </span>
                  <ArrowRight className="size-4 text-primary group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
