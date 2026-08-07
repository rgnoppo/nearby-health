// Router entry used ONLY by the Android/Capacitor build (see
// vite.config.capacitor.ts -> tanstackStart.router.entry).
//
// It imports the FILTERED route tree (routeTree.capacitor.gen.ts, generated
// from src/routes.capacitor/) instead of the normal routeTree.gen.ts, so
// admin.tsx and _authenticated/** — and everything they import, including
// src/lib/admin.functions.ts and src/components/admin/** — never enter this
// bundle's module graph at all. Nothing to tree-shake around: the code is
// simply never referenced by the native build's entry point.
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.capacitor.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
