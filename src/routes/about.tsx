import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Heart from "lucide-react/dist/esm/icons/heart";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import Scale from "lucide-react/dist/esm/icons/scale";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن المشروع والسياسة القانونية — دليل العيادات" },
      {
        name: "description",
        content:
          "تعرف على أهداف مشروع دليل العيادات المجاني، مصادر البيانات، وإخلاء المسؤولية وسياسة الحذف والتعديل.",
      },
      { property: "og:title", content: "عن المشروع والسياسة القانونية" },
      {
        property: "og:description",
        content: "مشروع مجاني غير ربحي لتسهيل الوصول لبيانات العيادات.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
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
            عن المشروع
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-lg px-4 pt-6 flex-1">
        <div>
          <h1 className="text-2xl font-extrabold leading-snug">عن المشروع والسياسة القانونية</h1>
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            نسعى لتوفير دليل مبسط يسهل على الجميع الوصول للعيادات بوضوح وشفافية.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {/* Section 1: Non-profit */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <Heart className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold">صدقة جارية ومجاني 100%</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              هذا الموقع هو عمل تطوعي، غير ربحي تماماً، ولا يحتوي على أي إعلانات مدفوعة أو اشتراكات. الهدف الوحيد هو التيسير على الناس ومساعدتهم في العثور على العيادات والأطباء بكل سهولة.
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
              🤍 وهو كذلك صدقة جارية على روح والدي الشيخ سيد عبد الموجود، وأختي رحمها الله، وجميع أموات المسلمين. اللهم اغفر لهم وارحمهم وأسكنهم فسيح جناتك.
            </p>
          </section>

          {/* Section 2: Data Source & Disclaimer */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold">إخلاء المسؤولية ومصدر البيانات</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              تم تجميع البيانات الموجودة في هذا الدليل من مصادر عامة متاحة للجميع (مثل لافتات الشوارع، صفحات التواصل الاجتماعي المفتوحة، والمساهمات المجتمعية). الموقع لا يتحمل أي مسؤولية قانونية عن دقة أو صحة البيانات، ولكنه يسعى دائماً لتحديثها.
            </p>
          </section>

          {/* Section 3: Right to modify/remove */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <Scale className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold">حق الحذف والتعديل (حق الطبيب)</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              نحترم خصوصية ورغبة جميع الأطباء وأصحاب العيادات. إذا كنت طبيباً أو ممثلاً لعيادة ووجدت بياناتك هنا وترغب في <strong className="text-foreground">تعديلها</strong> أو <strong className="text-foreground">حذفها بالكامل</strong>، هذا حقك تماماً وبدون أي شروط. سيتم الحذف الفوري بمجرد تواصلك معنا.
            </p>
            
            <a
              href={`https://wa.me/201028551063?text=${encodeURIComponent("مرحباً، أنا طبيب/ممثل عيادة وأود تعديل/حذف البيانات")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bd5a] transition-colors shadow-sm"
            >
              <MessageCircle className="h-5 w-5" />
              تواصل معنا لتعديل أو حذف بياناتك
            </a>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
