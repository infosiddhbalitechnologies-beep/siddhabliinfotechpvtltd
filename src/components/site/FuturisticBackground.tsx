import { useEffect, useRef, useState } from "react";

/**
 * Global cinematic background for the app.
 * - Animated aurora + gradient orbs
 * - Digital grid
 * - Floating glowing particles
 * - Mouse parallax glow
 */
export function FuturisticBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<
    {
      left: string;
      size: number;
      delay: string;
      duration: string;
      hue: number;
    }[]
  >([]);

  useEffect(() => {
    // Generate particles only on client to avoid SSR hydration mismatch
    const next = Array.from({ length: 36 }).map(() => ({
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2.5,
      delay: `-${Math.random() * 20}s`,
      duration: `${18 + Math.random() * 22}s`,
      hue: Math.random() > 0.5 ? 0 : 1,
    }));
    setParticles(next);

    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as any]: "0px", ["--my" as any]: "0px" }}
    >
      {/* Digital grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Aurora wash */}
      <div className="aurora" />

      {/* Mouse-tracking glow */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--mx), var(--my), 0)" }}
      >
        <div
          className="orb"
          style={{
            width: 520,
            height: 520,
            left: "8%",
            top: "12%",
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 60%, transparent), transparent 70%)",
            animationDuration: "22s",
          }}
        />
        <div
          className="orb"
          style={{
            width: 420,
            height: 420,
            right: "6%",
            top: "30%",
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--brand-2) 55%, transparent), transparent 70%)",
            animationDuration: "26s",
            animationDelay: "-6s",
          }}
        />
        <div
          className="orb"
          style={{
            width: 480,
            height: 480,
            left: "40%",
            top: "60%",
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--brand-3) 55%, transparent), transparent 70%)",
            animationDuration: "30s",
            animationDelay: "-12s",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: p.left,
              bottom: `-${p.size * 2}px`,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              background:
                p.hue === 0
                  ? "color-mix(in oklab, var(--brand-2) 90%, transparent)"
                  : "color-mix(in oklab, var(--brand-3) 90%, transparent)",
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, color-mix(in oklab, var(--background) 90%, transparent) 100%)",
        }}
      />
    </div>
  );
}
