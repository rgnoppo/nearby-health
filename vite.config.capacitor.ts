// Separate Vite config used ONLY for the Android/Capacitor build.
// The regular `vite.config.ts` (Vercel + SSR) is untouched and keeps working exactly as before.
//
// This config turns on TanStack Start's official "SPA mode":
// https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode
//
// - No SSR at runtime, no Nitro server is shipped.
// - `vite build` still runs one local SSR pass (via the `nitro` plugin) ONLY to
//   pre-render the app shell into a single static file — that file becomes our
//   `index.html` for Capacitor.
// - Output goes to dist/client (same as the web build) and is copied into
//   `www-android/` by `scripts/copy-capacitor-www.mjs` right after the build,
//   so it never collides with the Vercel build artifacts.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      server: { entry: "server" },
      spa: {
        enabled: true,
        // Write the prerendered shell straight out as index.html so it can be
        // used directly as Capacitor's webDir entry point — no rename step needed.
        prerender: {
          outputPath: "/index.html",
        },
      },
      router: {
        // Native build reads routes from `src/routes.capacitor/` — a filtered
        // copy of `src/routes/` with admin.tsx and _authenticated/** removed
        // (see scripts/prepare-capacitor-routes.mjs, run before this config
        // builds). That directory doesn't exist for the web build, so the
        // Vercel/browser app keeps using the full `src/routes/` untouched.
        // NOTE: resolved relative to src/ — no "src/" prefix here.
        routesDirectory: "routes.capacitor",
        generatedRouteTree: "routeTree.capacitor.gen.ts",
        // Points at the filtered route tree above instead of the default
        // src/router.tsx (which imports the full, admin-included tree).
        // NOTE: resolved relative to src/, same as routesDirectory below —
        // no "src/" prefix here.
        entry: "router.capacitor.tsx",
      },
    }),
    // No `preset` here on purpose: Nitro's documented default ("node server")
    // is exactly what we need to run the local prerender pass during `vite build`.
    // The resulting dist/server output is never shipped to the app — only
    // dist/client (the static shell + JS/CSS bundles) is used.
    nitro({}),
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Same chunking strategy as the web build, kept for consistency.
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/sonner")) {
            return "vendor-sonner";
          }
          if (id.includes("node_modules/fuse.js")) {
            return "vendor-fuse";
          }
        },
      },
    },
  },
});
