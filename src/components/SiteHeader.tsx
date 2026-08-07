import { Link } from "@tanstack/react-router";
import Stethoscope from "lucide-react/dist/esm/icons/stethoscope";
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SiteHeader({ subtitle }: { subtitle?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b transition-all duration-300",
        scrolled
          ? "border-border/50 bg-background/80 backdrop-blur-xl shadow-sm"
          : "border-border/20 bg-transparent",
      )}
    >
      <div className="mx-auto grid max-w-lg grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Stethoscope className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-tight">
              دليل العيادات
            </span>
            {subtitle ? (
              <span className="block truncate text-sm text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>
        </Link>

        <Link
          to="/suggest"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          ضيف عيادة
        </Link>
      </div>
    </header>
  );
}
