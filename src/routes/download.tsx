import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Download from "lucide-react/dist/esm/icons/download";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import { SiteFooter } from "@/components/SiteFooter";
import appIcon from "../../icons/icon-512.webp";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "تحميل تطبيق Android — دليل العيادات" },
      {
        name: "description",
        content:
          "حمّل تطبيق دليل العيادات على موبايلك — نفس البيانات، نفس السرعة، وبدون إعلانات.",
      },
      { property: "og:title", content: "تحميل تطبيق Android — دليل العيادات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadPage,
});

const APK_PATH = "/downloads/nearby-health.apk";

function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Back bar ── */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="ارجع لقايمة العيادات"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <span className="min-w-0 truncate font-display text-base font-bold">
            تحميل التطبيق
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-10 flex-1 flex flex-col items-center text-center gap-8">

        {/* ── App icon ── */}
        <img
          src={appIcon}
          alt="أيقونة دليل العيادات"
          className="h-24 w-24 rounded-3xl shadow-lg"
          style={{ background: "linear-gradient(135deg, oklch(0.42 0.12 195), oklch(0.36 0.14 205))" }}
        />

        {/* ── Title + description ── */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold leading-snug">
            دليل العيادات على موبايلك 📱
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
            نفس البيانات والمميزات، بدون إعلانات، وبدون اشتراكات.
          </p>
        </div>

        {/* ── Download button ── */}
        <div className="w-full space-y-2">
          <a
            href={APK_PATH}
            download="nearby-health.apk"
            id="download-apk-btn"
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl text-base font-bold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.42 0.12 195), oklch(0.36 0.14 205))",
              boxShadow: "0 4px 20px -4px oklch(0.42 0.12 195 / 0.45)",
            }}
          >
            <Download className="h-5 w-5 shrink-0" />
            تحميل تطبيق Android
          </a>
          <p className="text-xs text-muted-foreground">
            Android &bull; APK &bull; آخر إصدار رسمي
          </p>
        </div>

        {/* ── Warning card — single, compact ── */}
        <section
          className="w-full rounded-2xl border p-4 text-start"
          style={{
            borderColor: "oklch(0.85 0.06 80 / 0.5)",
            background: "oklch(0.98 0.015 80 / 0.6)",
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-amber-600"
              style={{ background: "oklch(0.93 0.05 80 / 0.6)" }}
            >
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                ملاحظة قبل التثبيت
              </p>
              <p className="text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                التطبيق مش على Google Play دلوقتي، فممكن Android يبعتلك تحذير
                أثناء التثبيت — ده طبيعي. التطبيق ده هو النسخة الرسمية من الموقع
                وآمن تمامًا.
              </p>
            </div>
          </div>
        </section>

        {/* ── Fallback link ── */}
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          مش حابب تثبته؟ استخدم الموقع
        </a>

      </main>

      <SiteFooter />
    </div>
  );
}
