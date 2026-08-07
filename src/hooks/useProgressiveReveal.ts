import { useEffect, useRef, useState, useCallback } from "react";

const PAGE_SIZE = 5;

/**
 * Progressive reveal hook.
 * Returns how many items to show and a sentinel ref to attach to the
 * last visible item (or a loader element). When the sentinel enters the
 * viewport the visible count grows by PAGE_SIZE.
 */
export function useProgressiveReveal(total: number) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when total changes (search / filter change)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [total]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, total));
  }, [total]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }, // start loading 200px before the element hits the viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasMore = visibleCount < total;

  return { visibleCount, hasMore, sentinelRef, loadMore };
}
