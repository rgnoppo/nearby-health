import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
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
    }),
    nitro({
      preset: "vercel",
    }),
    react(),
  ],
  build: {
    // Enable source maps for production debugging (remove if not needed)
    // sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — tiny, always needed
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // Radix UI primitives — large but shared across components
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Supabase — loaded only after interaction
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // Recharts — dashboard only, defer it
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          // Sonner toast — already lazy-loaded, keep separate
          if (id.includes("node_modules/sonner")) {
            return "vendor-sonner";
          }
          // Fuse.js fuzzy search
          if (id.includes("node_modules/fuse.js")) {
            return "vendor-fuse";
          }
        },
      },
    },
  },
});