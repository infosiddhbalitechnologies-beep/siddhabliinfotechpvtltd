import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Line } from "@react-three/drei";
import * as THREE from "three";

/**
 * Purely decorative WebGL 3D background layer — a subtle "AI network"
 * effect: slow-floating glowing nodes with thin, low-opacity connecting
 * lines, plus a faint ambient particle drift. Designed to sit quietly
 * behind content, not draw attention to itself.
 *
 * - Renders on every page (rendered once, globally, in __root.tsx),
 *   fixed to the viewport, so it stays visible across the entire site,
 *   not just the hero section.
 * - Pinned to its own GPU compositor layer (transform/will-change) so it
 *   stays visually fixed through scroll instead of flickering/dropping
 *   out — a common issue for fixed-position WebGL canvases.
 * - Never captures mouse/touch/click events — the wrapping div and the
 *   canvas itself are pointer-events-none, and mouse parallax is read
 *   from a window-level `pointermove` listener (the same technique the
 *   existing FuturisticBackground already uses), never from the canvas's
 *   own event system. No OrbitControls, no raycasting, no onClick
 *   handlers anywhere in the scene.
 * - Layers ON TOP of the existing FuturisticBackground (both are
 *   siblings inside the same fixed background wrapper in __root.tsx);
 *   this component only ever paints its own transparent WebGL canvas and
 *   never touches or removes FuturisticBackground's DOM.
 * - Renders nothing if WebGL is unavailable or the visitor has
 *   prefers-reduced-motion enabled, so it can only ever be a no-op, never
 *   a crash or an accessibility regression.
 */

// Approximate hex equivalents of this project's brand OKLCH tokens
// (--brand / --brand-2 / --brand-3 from styles.css) so the 3D palette
// matches the rest of the site's "electric blue / neon cyan / violet"
// futuristic-enterprise look without depending on runtime CSS parsing.
const BRAND_BLUE = "#4c8dff";
const BRAND_CYAN = "#22d3ee";
const BRAND_VIOLET = "#a855f7";
const NODE_COLORS = [BRAND_BLUE, BRAND_CYAN, BRAND_VIOLET];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useWebglSupported() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

// Tracks pointer position as a normalized [-1, 1] target, read from a
// window-level listener so it works even though the canvas itself never
// receives pointer events (pointer-events-none).
function useParallaxTarget() {
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return target;
}

function ParallaxRig({
  target,
  children,
}: {
  target: React.MutableRefObject<{ x: number; y: number }>;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    // Extremely subtle, heavily eased parallax — just enough depth cue
    // on mouse movement to feel alive, never enough to be noticeable as
    // "interaction".
    const ease = Math.min(1, delta * 1.2);
    group.current.rotation.y +=
      (target.current.x * 0.05 - group.current.rotation.y) * ease;
    group.current.rotation.x +=
      (-target.current.y * 0.03 - group.current.rotation.x) * ease;
  });
  return <group ref={group}>{children}</group>;
}

type NodeDef = { pos: [number, number, number]; color: string; size: number };

// Deterministically generates a scattered field of node positions plus
// the short list of nearest-neighbor connections between them, computed
// once and memoized — cheap, stable across renders, no per-frame cost.
function useNetwork() {
  return useMemo(() => {
    const count = 16;
    const nodes: NodeDef[] = [];
    // Simple deterministic pseudo-random spread (fixed seed pattern)
    // rather than Math.random(), so the layout is stable across
    // remounts/HMR and never causes a hydration mismatch.
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 8.12;
      const radius = 2.2 + (((i * 37) % 100) / 100) * 5.2;
      nodes.push({
        pos: [
          Math.cos(angle) * radius * 0.9,
          Math.sin(i * 12.9) * 3.2,
          Math.sin(angle) * radius - 3.5,
        ],
        color: NODE_COLORS[i % NODE_COLORS.length],
        size: 0.035 + (((i * 13) % 10) / 10) * 0.03,
      });
    }

    // Connect each node to its 1–2 nearest neighbors only, and only if
    // within a distance threshold — keeps the "network" sparse and
    // legible rather than a dense tangle.
    const connections: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = new THREE.Vector3(...nodes[i].pos);
      const distances = nodes
        .map((n, j) => ({ j, d: a.distanceTo(new THREE.Vector3(...n.pos)) }))
        .filter((d) => d.j !== i)
        .sort((x, y) => x.d - y.d);
      const neighborCount = i % 3 === 0 ? 2 : 1;
      for (let k = 0; k < neighborCount; k++) {
        const cand = distances[k];
        if (!cand || cand.d > 4.5) continue;
        const b = new THREE.Vector3(...nodes[cand.j].pos);
        // Avoid drawing the same pair twice.
        const dup = connections.some(
          ([p1, p2]) =>
            (p1.equals(a) && p2.equals(b)) || (p1.equals(b) && p2.equals(a)),
        );
        if (!dup) connections.push([a, b]);
      }
    }

    return { nodes, connections };
  }, []);
}

function NetworkNode({ node }: { node: NodeDef }) {
  return (
    <Float
      speed={0.35}
      rotationIntensity={0}
      floatIntensity={0.5}
      floatingRange={[-0.15, 0.15]}
    >
      <mesh position={node.pos}>
        <sphereGeometry args={[node.size, 12, 12]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.9}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.55}
        />
      </mesh>
    </Float>
  );
}

function NetworkLines({
  connections,
}: {
  connections: [THREE.Vector3, THREE.Vector3][];
}) {
  return (
    <>
      {connections.map(([a, b], i) => (
        <Line
          key={i}
          points={[a, b]}
          color={BRAND_CYAN}
          lineWidth={0.6}
          transparent
          opacity={0.12}
        />
      ))}
    </>
  );
}

function SlowRotatingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    // Very slow ambient drift of the whole network — barely perceptible,
    // just enough to avoid a completely static feel.
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });
  return <group ref={ref}>{children}</group>;
}

function Scene() {
  const target = useParallaxTarget();
  const { nodes, connections } = useNetwork();

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={18} color={BRAND_BLUE} />
      <pointLight position={[-5, -3, -2]} intensity={12} color={BRAND_VIOLET} />
      <pointLight position={[0, 4, -6]} intensity={10} color={BRAND_CYAN} />

      <ParallaxRig target={target}>
        <SlowRotatingGroup>
          <NetworkLines connections={connections} />
          {nodes.map((n, i) => (
            <NetworkNode key={i} node={n} />
          ))}
        </SlowRotatingGroup>

        {/* Faint ambient dust — separate from, and much subtler than,
            the network nodes above. */}
        <Sparkles
          count={90}
          scale={[16, 9, 12]}
          size={1}
          speed={0.08}
          opacity={0.12}
          color={BRAND_CYAN}
        />
      </ParallaxRig>
    </>
  );
}

export function AnimatedBackground() {
  const reducedMotion = useReducedMotion();
  const webglSupported = useWebglSupported();

  // Fail safe / accessibility: render nothing rather than risk breaking
  // the page. The existing FuturisticBackground (CSS-only) still covers
  // the background in every one of these cases.
  if (reducedMotion || webglSupported === false) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        pointerEvents: "none",
        // Pins this layer to its own GPU compositor layer so it stays
        // visually fixed through scroll instead of flickering/dropping
        // out — a common issue for fixed-position WebGL canvases.
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        camera={{ position: [0, 0, 7], fov: 45 }}
        style={{ pointerEvents: "none" }}
        // No R3F event system needed — nothing in the scene is
        // interactive, and the canvas must never intercept input.
        events={undefined}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}