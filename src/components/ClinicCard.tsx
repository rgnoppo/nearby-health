import { Link } from "@tanstack/react-router";
import Clock from "lucide-react/dist/esm/icons/clock";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Phone from "lucide-react/dist/esm/icons/phone";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import type { Clinic } from "@/lib/clinic-api";
import type { PhoneEntry } from "@/components/admin/ClinicForm";
import { ShareButton } from "@/components/ShareButton";
import { formatRelativeTimeArabic } from "@/lib/utils";

/**
 * Strip corrupted URL-prefixed strings that sneak in from the dashboard
 * e.g. "wdhttp://localhost:8080/dashboard" → ""
 * This prevents text-height jumping that causes CLS.
 */
function sanitizeField(value: string | null | undefined): string {
  if (!value) return "—";
  // Remove any URL-like prefix (http/https/wdhttp/ftp + ://...)
  const cleaned = value.replace(/^\w{0,10}:\/\/[^\s]*/i, "").trim();
  return cleaned || "—";
}

export function ClinicCard({
  clinic,
  categoryName,
}: {
  clinic: Clinic;
  categoryName?: string | undefined;
}) {
  // Collect all phones: primary first, then extra
  const extraPhones = (clinic.extra_phones as PhoneEntry[] | null) ?? [];
  const allPhones = [
    { number: clinic.phone, label: "" },
    ...extraPhones,
  ].filter((p) => p.number?.trim());

  // Show first 2, indicate the rest
  const visiblePhones = allPhones.slice(0, 2);
  const hiddenCount = allPhones.length - visiblePhones.length;

  return (
    <Link
      to="/clinic/$clinicId"
      params={{ clinicId: clinic.id }}
      className="card-interactive block rounded-2xl border border-border bg-card p-5 shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-secondary/40"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug">{clinic.name}</h2>
          {clinic.specialty ? (
            <p className="mt-0.5 text-sm font-semibold text-primary">
              {clinic.specialty}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {categoryName ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              {categoryName}
            </span>
          ) : null}
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <ShareButton id={clinic.id} name={clinic.name} type="clinic" variant="icon" className="h-8 w-8 !bg-transparent text-muted-foreground hover:text-foreground" />
          </div>
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground/60" />
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-[0.9rem] text-muted-foreground">
        <div className="flex min-w-0 items-start gap-2.5">
          <Navigation width={16} height={16} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
          <dd className="min-w-0 leading-snug">{sanitizeField(clinic.landmark)}</dd>
        </div>
        <div className="flex min-w-0 items-start gap-2.5">
          <MapPin width={16} height={16} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
          <dd className="min-w-0 leading-snug">{sanitizeField(clinic.address)}</dd>
        </div>
        <div className="flex min-w-0 items-start gap-2.5">
          <Clock width={16} height={16} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
          <dd className="min-w-0 leading-snug">{sanitizeField(clinic.working_hours)}</dd>
        </div>

        {/* Phones — show up to 2, badge for the rest */}
        <div className="flex min-w-0 items-start gap-2.5">
          <Phone width={16} height={16} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
          <dd className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            {visiblePhones.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span dir="ltr" className="font-semibold text-foreground text-[0.9rem]">
                  {sanitizeField(p.number)}
                </span>
                {p.label ? (
                  <span className="text-xs text-muted-foreground">({p.label})</span>
                ) : null}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                +{hiddenCount} أرقام
              </span>
            )}
          </dd>
        </div>
        
        {clinic.last_verified_at && (
          <div className="mt-2 text-end">
            <span className="text-[10px] text-muted-foreground/50">
              آخر تحديث: {formatRelativeTimeArabic(clinic.last_verified_at)}
            </span>
          </div>
        )}
      </dl>
    </Link>
  );
}
