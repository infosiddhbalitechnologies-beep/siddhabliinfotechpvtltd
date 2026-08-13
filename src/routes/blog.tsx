import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Newspaper } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { COMPANY } from "@/lib/site-data";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content: "Notes and updates from the SIDDHBALI TECHNOLOGIES team.",
      },
      { property: "og:title", content: "Blog — SIDDHBALI TECHNOLOGIES" },
      {
        property: "og:description",
        content: "Notes and updates from the SIDDHBALI TECHNOLOGIES team.",
      },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Blog,
});

function Blog() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-24 text-center">
      <Reveal>
        <div className="glass rounded-3xl p-10 sm:p-14">
          <div className="mx-auto size-14 rounded-2xl animated-gradient grid place-items-center text-white neon-glow">
            <Newspaper className="size-6" />
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-display font-bold">
            Blog — coming soon
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {COMPANY} is early-stage, and we'd rather publish nothing than
            publish filler. We'll share notes on our work here once we have real
            project write-ups worth reading.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
          >
            Get in touch instead <ArrowRight className="size-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
