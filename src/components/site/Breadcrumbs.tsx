import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const labels: Record<string, string> = {
  about: "About",
  services: "Services",
  team: "Team",
  careers: "Careers",
  blog: "Blog",
  contact: "Contact",
  track: "Support",
};

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/") return null;
  const segs = pathname.split("/").filter(Boolean);
  let acc = "";
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2"
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="size-3.5" /> Home
          </Link>
        </li>
        {segs.map((seg, i) => {
          acc += `/${seg}`;
          const isLast = i === segs.length - 1;
          const label = labels[seg] ?? seg.replace(/-/g, " ");
          return (
            <li key={acc} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 opacity-50" />
              {isLast ? (
                <span className="text-foreground font-medium capitalize">
                  {label}
                </span>
              ) : (
                <Link
                  to={acc}
                  className="hover:text-foreground transition-colors capitalize"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
