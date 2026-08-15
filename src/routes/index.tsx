import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Search from "lucide-react/dist/esm/icons/search";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ClinicCard } from "@/components/ClinicCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { fetchCategories } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { useInfiniteClinicScroll } from "@/hooks/useInfiniteClinicScroll";

export const Route = createFileRoute("/")((({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      category: search.category as string | undefined,
    }
  },
  head: () => ({
    meta: [
      { title: "دليل العيادات — دكاترة قريب منك بالعلامة المميزة" },
      {
        name: "description",
        content:
          "دور على أقرب عيادة بالتخصص: العنوان، علامة مميزة تعرفها بيها، مواعيد الشغل ورقم التليفون.",
      },
      { property: "og:title", content: "دليل العيادات — دكاترة قريب منك" },
      {
        property: "og:description",
        content: "عيادات بالتخصصات، العنوان والعلامة المميزة والمواعيد والتليفون.",
      },
    ],
  }),
  component: Home,
}) as any));

import { useNavigate } from "@tanstack/react-router";
import { ShareButton } from "@/components/ShareButton";

function Home() {
  const [term, setTerm] = useState("");
  const { category: activeCategoryParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.id });

  const activeCategory = activeCategoryParam || null;
  const setActiveCategory = (id: string | null) => {
    navigate({ search: (prev: any) => ({ ...prev, category: id || undefined }) });
  };

  // Categories are lightweight — fetch once, cache for the session
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) map.set(c.id, c.name);
    return map;
  }, [categories.data]);

  const visibleCategories = useMemo(() => {
    return (categories.data ?? []);
  }, [categories.data]);

  // Server-side paginated clinic fetching with manual Load More button
  const {
    clinics,
    isLoading,
    isFetchingMore,
    isError,
    totalCount,
    hasMore,
    loadMore,
  } = useInfiniteClinicScroll({
    search: term,
    categoryId: activeCategory,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader subtitle="عيادات جنبك" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4">
        {/* ── Hero Section — Elevated Clinical & Utility ── */}
        <section className="pt-8 pb-4 relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" />
            <span>دليلك الطبي المحلي</span>
          </div>
          <h1 className="text-3xl leading-[1.15] font-black tracking-tight text-foreground">
            لاقي العيادة الصح،
            <br />
            <span className="text-primary relative inline-block mt-1">
              بالعلامة اللي جنبها.
              <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
              </svg>
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-[90%]">
            كل عيادة مكتوب جنبها علامة مميزة تعرف بيها الباب من غير خرايط.
          </p>

          {/* Elevated search box */}
          <div className="relative mt-7 rounded-2xl bg-card shadow-sm border border-border/60 focus-within:border-primary/50 focus-within:shadow-md transition-all duration-300">
            <Search className="pointer-events-none absolute top-1/2 start-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="دور بالاسم أو التخصص أو المنطقة"
              aria-label="دور على عيادة"
              className="h-14 rounded-2xl border-0 bg-transparent ps-11 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
          </div>
        </section>

        {/* ── Category Filter — clean pills, no gradients ── */}
        {visibleCategories.length > 0 ? (
          <section className="mt-5" aria-label="فلتر التخصصات">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                فلتر بالتخصص
              </div>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 pb-1.5">
              <div className="flex w-max gap-2">
                <FilterChip
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  label="الكل"
                  count={null}
                />
                {visibleCategories.map((c) => (
                  <FilterChip
                    key={c.id}
                    id={c.id}
                    active={activeCategory === c.id}
                    onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
                    label={c.name}
                    count={null}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Results count ── */}
        {!isLoading && !isError && totalCount > 0 && (
          <p className="mt-4 mb-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span> عيادة
            {activeCategory ? ` في ${categoryNames.get(activeCategory) ?? "التخصص"}` : ""}
            {term.trim() ? ` تطابق "${term.trim()}"` : ""}
          </p>
        )}

        {/* ── Clinic List ── */}
        <section className="mt-3 space-y-3 min-h-[20rem]" aria-label="قايمة العيادات">
          {isLoading ? (
            <>
              <div className="clinic-skeleton"><ClinicSkeleton /></div>
              <div className="clinic-skeleton"><ClinicSkeleton /></div>
              <div className="clinic-skeleton"><ClinicSkeleton /></div>
            </>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
              <p className="text-base font-semibold text-destructive">
                مقدرناش نجيب قايمة العيادات
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                حدّث الصفحة وجرّب تاني.
              </p>
            </div>
          ) : clinics.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center">
              <p className="text-base font-semibold text-foreground">
                مفيش عيادة مطابقة للبحث
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                جرّب كلمة تانية، أو ضيف العيادة دي!
              </p>
              <Link
                to="/suggest"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <PlusCircle className="h-4 w-4" />
                ضيف عيادة
              </Link>
            </div>
          ) : (
            clinics.map((clinic) => (
              <div key={clinic.id} className="clinic-card-item">
                <ClinicCard
                  clinic={clinic}
                  categoryName={categoryNames.get(clinic.category_id ?? "")}
                />
              </div>
            ))
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-3 pb-1 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={loadMore}
                disabled={isFetchingMore}
                className="h-12 w-full max-w-sm rounded-2xl border-2 border-primary/20 bg-card hover:bg-primary/5 hover:border-primary/50 text-foreground font-bold text-sm shadow-sm transition-all duration-300 active:scale-[0.98]"
              >
                {isFetchingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>بيحمّل باقي العيادات…</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span>عرض المزيد من العيادات</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                )}
              </Button>
            </div>
          )}
        </section>

        {/* ── Footer CTA ── */}
        {!isLoading && !isError && clinics.length > 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
            <p className="text-base font-semibold text-foreground">شايف عيادة ناقصة؟</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ساعدنا وضيفها في أقل من دقيقة.
            </p>
            <Link
              to="/suggest"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <PlusCircle className="h-4 w-4" />
              ضيف عيادة
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function ClinicSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Row 1 (Top Bar) */}
      <div className="w-full flex justify-between items-center mb-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-md" />
        </div>
      </div>

      {/* Row 2: Doctor/Clinic Name */}
      <Skeleton className="h-6 w-3/4 max-w-[240px] rounded-lg mb-2.5" />

      {/* Body: 4 rows */}
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
        </div>
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  id,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | null;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center rounded-full border text-sm font-semibold transition-all duration-300 ease-in-out",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary/60 active:bg-secondary",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="flex h-full items-center gap-2 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-full transition-colors duration-300"
      >
        <span>{label}</span>
        {count !== null && (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[13px] font-bold tabular-nums transition-colors duration-300",
              active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {count}
          </span>
        )}
      </button>
      {id ? (
        <div
          className={cn(
            "flex h-full items-center overflow-hidden transition-all duration-300 ease-in-out",
            active ? "w-10 opacity-100 border-s border-primary-foreground/20" : "w-0 opacity-0 border-s border-transparent"
          )}
        >
          <div className="shrink-0 flex items-center justify-center w-10">
            <ShareButton
              id={id}
              name={label}
              type="category"
              variant="icon"
              className="h-8 w-8 !bg-transparent !text-primary-foreground hover:!bg-primary-foreground/20 rounded-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
