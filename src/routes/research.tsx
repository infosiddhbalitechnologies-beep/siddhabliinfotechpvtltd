import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FlaskConical,
  FileText,
  ScrollText,
  PenTool,
  Lightbulb,
  Search,
  Cpu,
  LineChart,
  BookOpen,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { COMPANY } from "@/lib/site-data";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Innovation — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Technical research, technology evaluation, white papers, case studies and documentation services from SIDDHBALI TECHNOLOGIES.",
      },
      {
        property: "og:title",
        content: "Research & Innovation — SIDDHBALI TECHNOLOGIES",
      },
      {
        property: "og:description",
        content:
          "Applied technical research and professional documentation for technology decisions.",
      },
    ],
    links: [{ rel: "canonical", href: "/research" }],
  }),
  component: ResearchPage,
});

const areas = [
  {
    id: "technical-research",
    Icon: Search,
    t: "Technical Research",
    d: "Structured evaluation of technologies, frameworks and tools before you commit to them.",
  },
  {
    id: "innovation",
    Icon: Lightbulb,
    t: "Innovation & Prototyping",
    d: "Proof-of-concept builds that test whether an idea is technically and commercially viable.",
  },
  {
    id: "ai-research",
    Icon: Cpu,
    t: "Applied AI Research",
    d: "Practical evaluation of AI models, prompting strategies and automation opportunities for a specific workflow.",
  },
  {
    id: "data-research",
    Icon: LineChart,
    t: "Data & Analysis Studies",
    d: "Analysis of operational data to answer a defined business question with evidence.",
  },
  {
    id: "whitepapers",
    Icon: FileText,
    t: "White Papers",
    d: "Long-form technical documents that explain an approach, architecture or technology position clearly.",
  },
  {
    id: "case-studies",
    Icon: ScrollText,
    t: "Case Studies",
    d: "Structured write-ups of a project, its constraints, the approach taken and the outcome.",
  },
  {
    id: "documentation",
    Icon: PenTool,
    t: "Technical Documentation",
    d: "System documentation, API references, user guides, SOPs and internal knowledge bases.",
  },
  {
    id: "business-writing",
    Icon: BookOpen,
    t: "Business & Report Writing",
    d: "Proposals, technical reports and structured business content prepared to a professional standard.",
  },
];

const process = [
  {
    n: "01",
    t: "Define the question",
    d: "We agree exactly what the research needs to answer and how the result will be used.",
  },
  {
    n: "02",
    t: "Gather evidence",
    d: "Technology review, benchmarks, data analysis or prototype builds — whatever the question requires.",
  },
  {
    n: "03",
    t: "Analyse",
    d: "Findings are compared against your constraints: cost, timeline, team skills and existing systems.",
  },
  {
    n: "04",
    t: "Document & recommend",
    d: "You receive a written deliverable with a clear recommendation and the reasoning behind it.",
  },
];

function ResearchPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-medium text-primary">
            Research &amp; Innovation
          </p>
          <h1
            className="mt-2 font-display font-bold leading-tight"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
          >
            Research that leads to a{" "}
            <span className="gradient-text">decision you can defend</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {COMPANY} carries out applied technical research and produces the
            documentation that goes with it. This is a service practice — we
            research and write for our clients, and we're transparent that we're
            an early-stage company rather than a decades-old research institute.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              Commission research <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/services"
              hash="research-technical-writing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-medium hover:bg-accent/40 transition"
            >
              See writing services
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">What we cover</p>
          <h2 className="mt-2 text-3xl font-display font-bold">
            Research &amp; documentation areas
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a, i) => (
            <Reveal key={a.id} delay={(i % 4) * 0.05}>
              <div
                id={a.id}
                className="scroll-mt-28 h-full glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-elegant transition"
              >
                <div className="size-11 rounded-xl animated-gradient grid place-items-center text-white neon-glow">
                  <a.Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display font-semibold">{a.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {a.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Our process</p>
          <h2 className="mt-2 text-3xl font-display font-bold">
            How a research engagement runs
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.05}>
              <div className="h-full glass rounded-2xl p-6">
                <div className="text-xs font-mono text-primary">{p.n}</div>
                <h3 className="mt-2 font-display font-semibold text-lg">
                  {p.t}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {p.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <Reveal>
          <div className="glass rounded-3xl p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl animated-gradient grid place-items-center text-white neon-glow">
                <FlaskConical className="size-5" />
              </div>
              <h2 className="text-2xl font-display font-bold">
                Where we're investing internally
              </h2>
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Alongside client work we build internal capability in the areas we
              expect to matter most for the organizations we serve.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
              {[
                {
                  t: "Applied AI & data",
                  d: "Practical automation and data-analysis patterns for document and back-office workflows.",
                },
                {
                  t: "Delivery tooling",
                  d: "Internal systems for scoping, tracking and supporting every engagement.",
                },
                {
                  t: "Documentation quality",
                  d: "Templates and standards that keep technical writing clear and consistent.",
                },
              ].map((c) => (
                <div
                  key={c.t}
                  className="rounded-2xl border border-border bg-card/50 p-5"
                >
                  <h3 className="font-medium">{c.t}</h3>
                  <p className="mt-1.5 text-muted-foreground leading-relaxed">
                    {c.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Reveal>
          <div className="glass rounded-3xl p-10">
            <h2 className="text-3xl font-display font-bold">
              Have a question worth researching?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Send us the decision you're trying to make and we'll propose a
              scope for answering it.
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
