// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
// mcpPlugin is Lovable's dev-time MCP tooling integration — it is NOT required
// for the app itself to build or run. Its current version (0.23.0) has a bug
// that crashes `vite dev` on Windows (path separator mismatch when checking
// routesDir), so it's disabled here to unblock local development.
// To re-enable: `import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";`
// and add mcpPlugin() back to the plugins array below, once you've either
// updated the package past this bug or applied the patch-package fix.
// import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [],
  // Pinned explicitly so there's no ambiguity about which localhost URL to open.
  // The base config auto-detects a port via "sandbox detection" which can vary —
  // this forces it to always be http://localhost:5173.
  vite: {
    server: {
      port: 5173,
      strictPort: true,
    },
  },
});
