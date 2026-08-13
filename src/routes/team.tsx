import { createFileRoute, Link } from "@tanstack/react-router";
import { Linkedin, Mail, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import ashutoshPhoto from "@/assets/team-ashutosh-tiwari.png";
import { COMPANY, EMAIL } from "@/lib/site-data";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Leadership — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Meet the leadership of SIDDHBALI TECHNOLOGIES, a software services company based in Gorakhpur, India.",
      },
      { property: "og:title", content: "Leadership — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content: "Ashutosh Tiwari, Founder & CEO of SIDDHBALI TECHNOLOGIES.",
      },
    ],
    links: [{ rel: "canonical", href: "/team" }],
  }),
  component: Team,
});

function Team() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-medium text-primary">Leadership</p>
          <h1
            className="mt-2 font-display font-bold leading-tight"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
          >
            The people behind <span className="gradient-text">{COMPANY}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            We're a young company and we keep this page honest — it lists only
            the people who are actually part of the organization today.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-8">
        <Reveal>
          <div className="glass rounded-3xl p-6 sm:p-10 grid gap-8 md:grid-cols-[260px_minmax(0,1fr)] items-start">
            <div className="aspect-square w-full max-w-[260px] mx-auto overflow-hidden rounded-2xl neon-glow bg-gradient-to-br from-indigo-500 to-cyan-400">
              <img
                src={ashutoshPhoto}
                alt="Ashutosh Tiwari, Founder & CEO"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">
                Ashutosh Tiwari
              </h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-primary">
                Founder &amp; CEO
              </p>
              <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Ashutosh Tiwari is the Founder and CEO of {COMPANY}. He leads
                  the company's direction across software engineering,
                  artificial intelligence, cloud technology and digital
                  solutions, and stays directly involved in how client work is
                  scoped and delivered.
                </p>
                <p>
                  His focus is straightforward: build a technology services
                  organization that is trusted for engineering quality and clear
                  communication, and that grows by doing good work rather than
                  by making large claims.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent/40 transition"
                >
                  <Mail className="size-4 text-primary" /> Email
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent/40 transition"
                >
                  <Linkedin className="size-4 text-primary" /> LinkedIn
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <div className="glass rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-display font-bold">
              We're growing our team
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
              We're building out engineering, QA, design and support roles. If
              you'd like to be considered, send us your details and we'll keep
              you in the queue.
            </p>
            <Link
              to="/careers"
              className="mt-6 inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              View careers <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
