import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Clock from "lucide-react/dist/esm/icons/clock";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Phone from "lucide-react/dist/esm/icons/phone";
import Info from "lucide-react/dist/esm/icons/info";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchCategories, fetchClinic } from "@/lib/clinic-api";
import type { PhoneEntry } from "@/components/admin/ClinicForm";
import { ShareButton } from "@/components/ShareButton";
import { formatRelativeTimeArabic } from "@/lib/utils";

export const Route = createFileRoute("/clinic/$clinicId")({
  head: () => ({
    meta: [
      { title: "تفاصيل العيادة — دليل العيادات" },
      {
        name: "description",
        content: "العنوان، العلامة المميزة، مواعيد الشغل ورقم التليفون بتاع العيادة.",
      },
      { property: "og:title", content: "تفاصيل العيادة — دليل العيادات" },
      {
        property: "og:description",
        content: "العنوان والعلامة المميزة والمواعيد وأرقام التواصل.",
      },
    ],
  }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const { clinicId } = Route.useParams();
  const clinic = useQuery({ queryKey: ["clinic", clinicId], queryFn: () => fetchClinic(clinicId) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  if (clinic.isLoading || categories.isLoading) {
    return (
      <div className="min-h-screen">
        {/* Back bar skeleton */}
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="mx-auto w-full max-w-lg flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-11 w-11 rounded-2xl skeleton-pulse" />
            <Skeleton className="h-5 w-40 rounded-lg skeleton-pulse" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-lg px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-3/4 rounded-xl skeleton-pulse" />
          <Skeleton className="h-5 w-1/3 rounded-lg skeleton-pulse" />
          <Skeleton className="h-44 w-full rounded-2xl skeleton-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl skeleton-pulse" />
            <Skeleton className="h-12 rounded-xl skeleton-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!clinic.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl font-extrabold text-muted-foreground/30">404</p>
        <h1 className="mt-4 text-xl font-bold">العيادة مش موجودة</h1>
        <p className="mt-2 text-base text-muted-foreground">
          ممكن تكون الرابط غلط أو العيادة اتشالت.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
        >
          <ArrowRight className="h-5 w-5" />
          ارجع لكل العيادات
        </Link>
      </div>
    );
  }

  const c = clinic.data;
  const categoryName = (categories.data ?? []).find((x) => x.id === c.category_id)?.name;
  const hasWhatsapp = Boolean(c.whatsapp);
  const extraPhones = (c.extra_phones as PhoneEntry[] | null) ?? [];

  return (
    <div className="min-h-screen flex flex-col pb-0">
      {/* ── Back navigation bar ── */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-lg grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="ارجع لقايمة العيادات"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <span className="min-w-0 truncate font-display text-base font-bold">{c.name}</span>
          <ShareButton id={c.id} name={c.name} type="clinic" variant="icon" className="h-11 w-11 rounded-2xl" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-lg px-4 py-6">
        {/* ── Clinic identity ── */}
        <div>
          <h1 className="text-2xl font-extrabold leading-snug">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {c.specialty ? (
              <p className="text-base font-semibold text-primary">{c.specialty}</p>
            ) : null}
            {categoryName ? (
              <span className="rounded-full bg-secondary px-3.5 py-1 text-sm font-bold text-secondary-foreground">
                {categoryName}
              </span>
            ) : null}
          </div>
          {c.last_verified_at && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50/80 w-fit px-2.5 py-1 rounded-md border border-emerald-100/50">
              <CheckCircle className="h-3.5 w-3.5" />
              تم التأكد من البيانات {formatRelativeTimeArabic(c.last_verified_at)}
            </div>
          )}
        </div>

        {/* ── Info card ── */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <Row icon={<Navigation className="h-5 w-5" />} label="العلامة المميزة" value={c.landmark} />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-opacity hover:opacity-80 -mx-2 px-2 py-1 rounded-lg"
          >
            <Row icon={<MapPin className="h-5 w-5" />} label="العنوان" value={c.address} subtext="اضغط لفتح العنوان على Google Map (قد يكون اللوكيشن على الخريطة غير دقيق)" />
          </a>
          <Row 
            icon={<Clock className="h-5 w-5" />} 
            label="مواعيد الشغل" 
            value={c.working_hours} 
            subtext="* المواعيد قابلة للتغيير حسب ظروف العيادة، يفضل التأكد هاتفياً قبل الذهاب."
          />
          <Row icon={<Phone className="h-5 w-5" />} label="التليفون" value={c.phone} ltr />
          {c.notes ? (
            <Row icon={<Info className="h-5 w-5" />} label="معلومة تفيدك" value={c.notes} />
          ) : null}
        </section>

        {/* ── Action buttons ── */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`tel:${c.phone.replace(/\s/g, "")}`}
            className="btn-phone flex h-12 flex-row items-center justify-center gap-2 rounded-xl font-bold"
            aria-label={`اتصل بـ ${c.name}`}
          >
            <Phone className="h-5 w-5" />
            <span className="text-sm">اتصل دلوقتي</span>
          </a>

          {hasWhatsapp ? (
            <a
              href={`https://wa.me/${c.whatsapp!.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp flex h-12 flex-row items-center justify-center gap-2 rounded-xl font-bold"
              aria-label={`واتساب ${c.name}`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm">واتساب</span>
            </a>
          ) : (
            <div
              className="btn-whatsapp-disabled flex h-12 flex-row items-center justify-center gap-2 rounded-xl"
              aria-label="مفيش واتساب لهذه العيادة"
              role="button"
              aria-disabled="true"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">مفيش واتساب</span>
            </div>
          )}
        </div>

        {/* ── Extra phones ── */}
        {extraPhones.length > 0 && (
          <section className="mt-3 space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">أرقام أخرى</p>
            {extraPhones.map((p, i) => (
              <a
                key={i}
                href={`tel:${p.number.replace(/\s/g, "")}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 h-12 transition-colors hover:bg-secondary/60 active:bg-secondary"
                aria-label={`اتصل على ${p.label || p.number}`}
              >
                <span className="text-sm font-semibold text-foreground">
                  {p.label || `رقم ${i + 2}`}
                </span>
                <span dir="ltr" className="text-sm font-bold text-primary">{p.number}</span>
              </a>
            ))}
          </section>
        )}

        {/* ── Suggest CTA ── */}
        <div className="mt-8 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
          <p className="text-base font-semibold text-foreground">
            شايف عيادة ناقصة من الدليل؟
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ساعدنا في ثوانٍ وبدون تسجيل.
          </p>
          <Link
            to="/suggest"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            ضيفها لينا
          </Link>
        </div>

        {/* ── Report Issue CTA ── */}
        <div className="mt-5 text-center">
          <a
            href={`https://wa.me/201028551063?text=${encodeURIComponent(`مرحباً، أود الإبلاغ عن معلومة خاطئة أو ناقصة بخصوص عيادة ${c.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-border hover:decoration-primary/50"
          >
            هل توجد معلومة خاطئة أو ناقصة؟ أبلغنا لتصحيحها
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  ltr,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
  subtext?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-primary/70">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase mb-0.5">
          {label}
        </p>
        <p dir={ltr ? "ltr" : undefined} className={`text-sm font-semibold leading-relaxed text-foreground ${ltr ? "text-right" : ""}`}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-muted-foreground/70 font-normal mt-1">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
