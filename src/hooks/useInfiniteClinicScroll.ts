import { useCallback, useEffect, useRef, useState } from "react";
import { fetchClinics, CLINICS_PAGE_SIZE } from "@/lib/clinic-api";
import type { Clinic } from "@/lib/clinic-api";

export interface UseInfiniteClinicScrollOptions {
  search: string;
  categoryId: string | null;
}

export interface UseInfiniteClinicScrollResult {
  clinics: Clinic[];
  isLoading: boolean;       // first page loading
  isFetchingMore: boolean;  // subsequent pages loading
  isError: boolean;
  totalCount: number;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  reset: () => void;
}

/**
 * Fetches clinics page-by-page from Supabase (server-side pagination).
 * Appends results on scroll — no client-side search, no full-list download.
 *
 * Debounces the search term by 400 ms so we don't fire a request on every keystroke.
 */
export function useInfiniteClinicScroll(
  options: UseInfiniteClinicScrollOptions
): UseInfiniteClinicScrollResult {
  const { search, categoryId } = options;

  // Debounced values — only update after the user stops typing 400 ms
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedCategory, setDebouncedCategory] = useState(categoryId);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    // Category changes are instant — no debounce needed
    setDebouncedCategory(categoryId);
  }, [categoryId]);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isError, setIsError] = useState(false);

  // Track the "current generation" so stale async responses are discarded
  const generationRef = useRef(0);

  /** Full reset whenever search/category changes */
  const reset = useCallback(() => {
    generationRef.current += 1;
    setClinics([]);
    setPage(0);
    setTotalCount(0);
    setHasMore(false);
    setIsError(false);
    setIsLoading(true);
  }, []);

  // Reset when debounced values change
  useEffect(() => {
    reset();
  }, [debouncedSearch, debouncedCategory, reset]);

  // Fetch the current page whenever page/filters change
  useEffect(() => {
    const gen = generationRef.current;
    let cancelled = false;

    const load = async () => {
      try {
        const result = await fetchClinics({
          page,
          search: debouncedSearch || undefined,
          categoryId: debouncedCategory || undefined,
        });

        if (cancelled || gen !== generationRef.current) return;

        setClinics((prev) =>
          page === 0 ? result.data : [...prev, ...result.data]
        );
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setIsError(false);
      } catch {
        if (cancelled || gen !== generationRef.current) return;
        setIsError(true);
      } finally {
        if (!cancelled && gen === generationRef.current) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [page, debouncedSearch, debouncedCategory]);

  // Sentinel ref — attach to a loading indicator at the bottom
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore && !isLoading) {
          setIsFetchingMore(true);
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "300px" } // Start loading 300px before hitting bottom
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading]);

  return {
    clinics,
    isLoading,
    isFetchingMore,
    isError,
    totalCount,
    hasMore,
    sentinelRef,
    reset,
  };
}
