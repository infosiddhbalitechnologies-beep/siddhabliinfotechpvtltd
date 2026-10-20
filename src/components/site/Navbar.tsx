import { useState, useEffect, useRef } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  Search,
  ChevronDown,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { SERVICES } from "@/lib/site-data";

type NavItem = {
  to: string;
  hash?: string;
  label: string;
  desc?: string;
  Icon?: any;
};

const servicesMenu: NavItem[] = SERVICES.map((s) => ({
  to: "/services",
  hash: s.id,
  label: s.name,
  desc: s.summary,
  Icon: s.Icon,
}));

const topLinks = [
  { to: "/", label: "Home", exact: true as const },
  { to: "/about", label: "About" },
  { to: "/team", label: "Leadership" },
  { to: "/careers", label: "Careers" },
 // { to: "/track", label: "Support" },
 // { to: "/raise-ticket", label: "Raise a Ticket" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [openMenu, setOpenMenu] = useState<null | "services">(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeTimer = useRef<number | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    setOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  const hoverIn = (m: "services") => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenMenu(m);
  };
  const hoverOut = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 120);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const map: Array<{ k: string[]; to: string; hash?: string }> = [
      {
        k: ["it support", "service desk", "helpdesk", "support"],
        to: "/services",
        hash: "it-support",
      },
      {
        k: ["software", "custom", "development"],
        to: "/services",
        hash: "software-development",
      },
      {
        k: ["web", "app", "application", "website"],
        to: "/services",
        hash: "web-app-development",
      },
      { k: ["ai", "data"], to: "/services", hash: "ai-data-solutions" },
      {
        k: ["automation", "workflow", "process"],
        to: "/services",
        hash: "automation-solutions",
      },
      {
        k: ["design", "graphic", "branding"],
        to: "/services",
        hash: "graphic-design",
      },
      {
        k: ["research", "writing", "documentation", "report"],
        to: "/services",
        hash: "research-technical-writing",
      },
      { k: ["ticket", "issue"], to: "/services", hash: "ticket-management" },
      { k: ["team", "leader"], to: "/team" },
      { k: ["career", "job", "hire"], to: "/careers" },
      { k: ["blog", "article"], to: "/blog" },
      { k: ["contact", "sales"], to: "/contact" },
      { k: ["about", "company"], to: "/about" },
      { k: ["track"], to: "/track" },
    ];
    const hit = map.find((m) => m.k.some((kw) => q.includes(kw)));
    navigate({ to: hit?.to ?? "/services", hash: hit?.hash });
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-[9999] isolate transition-all ${scrolled ? "py-2" : "py-4"}`}
      onMouseLeave={hoverOut}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    
        <div
          className={`glass rounded-2xl pl-4 pr-2 sm:pl-6 sm:pr-3 flex items-center justify-between h-14 transition-shadow ${scrolled ? "shadow-elegant" : ""}`}
        >
          {/* Logo — left, shrink-0 */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 font-display font-bold text-lg"
          >
            <img
              src={logo}
              alt="SIDDHBALI TECHNOLOGIES logo"
              className="size-8 rounded-lg object-contain"
            />
            <span className="whitespace-nowrap">SIDDHBALI</span>
          </Link>

          {/* Nav links — centered, single line */}
          <nav className="hidden [@media(min-width:1400px)]:flex items-center justify-center gap-0.5">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="px-3 py-2 text-sm whitespace-nowrap rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors data-[status=active]:text-foreground data-[status=active]:bg-accent"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="px-3 py-2 text-sm whitespace-nowrap rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors data-[status=active]:text-foreground data-[status=active]:bg-accent"
            >
              About
            </Link>

            <div onMouseEnter={() => hoverIn("services")} className="relative">
              <Link
                to="/services"
                className="inline-flex items-center gap-1 px-3 py-2 text-sm whitespace-nowrap rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors data-[status=active]:text-foreground data-[status=active]:bg-accent"
              >
                Services
                <ChevronDown
                  className={`size-3.5 transition-transform ${openMenu === "services" ? "rotate-180" : ""}`}
                />
              </Link>
            </div>

            {topLinks.slice(2).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-2 text-sm whitespace-nowrap rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors data-[status=active]:text-foreground data-[status=active]:bg-accent"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right actions — right, shrink-0 */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="size-9 shrink-0 grid place-items-center rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Search className="size-4" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="size-9 shrink-0 grid place-items-center rounded-lg hover:bg-accent/50 transition-colors"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              to="/track"
              className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card hover:bg-accent/40 px-3 py-2 text-xs font-medium transition ml-1"
              title="Track a ticket"
            >
              <TicketCheck className="size-3.5 text-primary" /> Track
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-2 text-xs font-medium transition"
                title="Admin"
              >
                <ShieldCheck className="size-3.5 text-primary" /> Admin
              </Link>
            )}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg animated-gradient text-white px-3 py-2 text-xs font-medium shadow-elegant hover:opacity-90 transition ml-1"
                >
                  <LayoutDashboard className="size-3.5" /> Dashboard
                </Link>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  className="size-9 shrink-0 grid place-items-center rounded-lg hover:bg-accent/50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg animated-gradient text-white px-4 py-2 text-sm font-medium shadow-elegant hover:opacity-90 transition ml-1"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              className="[@media(min-width:1400px)]:hidden size-9 shrink-0 grid place-items-center rounded-lg hover:bg-accent/50"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Search panel */}
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              onSubmit={onSearch}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 glass rounded-2xl p-3 flex items-center gap-2"
            >
              <Search className="size-4 text-muted-foreground ml-2" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services…"
                className="flex-1 bg-transparent outline-none text-sm py-2"
              />
              <button
                type="submit"
                className="rounded-lg animated-gradient text-white px-3 py-1.5 text-xs font-medium"
              >
                Go
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Desktop dropdown / mega-menu */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              key={openMenu}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              onMouseEnter={() => hoverIn(openMenu)}
              onMouseLeave={hoverOut}
              className="hidden [@media(min-width:1400px)]:block absolute left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 mt-2 z-[10000]"
            >
              <div className="mega-menu-glass rounded-2xl p-6 shadow-elegant">
                {openMenu === "services" && <ServicesPanel />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="[@media(min-width:1400px)]:hidden fixed inset-0 -z-10 bg-background/95 backdrop-blur-2xl"
              aria-hidden
            />
          )}
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="[@media(min-width:1400px)]:hidden mt-2 glass rounded-2xl p-3 flex flex-col max-h-[75vh] overflow-y-auto relative bg-background"
            >
              {topLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-3 rounded-lg text-sm hover:bg-accent/50 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <MobileGroup title="Services" items={servicesMenu} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

function MenuItem({ item }: { item: NavItem }) {
  const Icon = item.Icon ?? Sparkles;
  return (
    <Link
      to={item.to}
      hash={item.hash}
      className="group flex items-start gap-3 rounded-xl p-3 hover:bg-accent/50 transition-colors"
    >
      <span className="shrink-0 size-9 rounded-lg animated-gradient grid place-items-center text-white">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {item.label}
        </span>
        {item.desc && (
          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.desc}
          </span>
        )}
      </span>
    </Link>
  );
}

function FeaturedCard({
  tag,
  title,
  desc,
  to,
}: {
  tag: string;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="relative block h-full rounded-2xl overflow-hidden p-5 animated-gradient text-white shadow-elegant hover:opacity-95 transition"
    >
      <div className="absolute inset-0 opacity-30 grid-bg pointer-events-none" />
      <div className="relative">
        <span className="inline-block text-[10px] uppercase tracking-wider font-semibold bg-white/20 backdrop-blur rounded-full px-2 py-0.5">
          {tag}
        </span>
        <h4 className="mt-3 font-display font-semibold text-lg leading-snug">
          {title}
        </h4>
        <p className="mt-1.5 text-xs text-white/85 leading-relaxed">{desc}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium">
          Explore <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function ServicesPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Services
          </p>
          <Link
            to="/services"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-1">
          {servicesMenu.map((i) => (
            <MenuItem key={i.label} item={i} />
          ))}
        </div>
      </div>
      <FeaturedCard
        tag="Start here"
        title="Not sure what you need?"
        desc="Describe the problem and we'll scope the right service honestly."
        to="/contact"
      />
    </div>
  );
}

function MobileGroup({ title, items }: { title: string; items: NavItem[] }) {
  const [o, setO] = useState(false);
  return (
    <div className="border-t border-border/50 mt-1 pt-1">
      <button
        onClick={() => setO((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm hover:bg-accent/50"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown
          className={`size-4 transition-transform ${o ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {o && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-2 pb-2">
              {items.map((i) => (
                <Link
                  key={i.label}
                  to={i.to}
                  hash={i.hash}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent/50"
                >
                  {i.Icon && <i.Icon className="size-4 text-primary" />}{" "}
                  {i.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
