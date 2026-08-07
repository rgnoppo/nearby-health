import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 3 minutes — no refetch on every navigation
        staleTime: 3 * 60 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch just because the user switched tabs
        refetchOnWindowFocus: false,
        // Retry once on failure, not 3 times (default)
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload pages when the user hovers/touches a link
    defaultPreload: "intent",
    // Reuse prefetched data for up to 30 seconds
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
