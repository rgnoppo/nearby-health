import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Send from "lucide-react/dist/esm/icons/send";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchCategories, submitSuggestion } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/suggest")({
  head: () => ({
    meta: [
      { title: "ضيف عيادة — دليل العيادات" },
      {
        name: "description",
        content:
          "تعرف عيادة ناقصة؟ ابعتلنا اسمها وعنوانها والعلامة المميزة ورقم التليفون — والباقي اختياري.",
      },
      { property: "og:title", content: "ضيف عيادة — دليل العيادات" },
      {
        property: "og:description",
        content: "ابعت اقتراح عيادة في أقل من دقيقة، ومن غير حساب.",
      },
    ],
  }),
  component: SuggestPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "اسم العيادة مطلوب").max(120),
  address: z.string().trim().min(4, "العنوان مطلوب").max(240),
  landmark: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(5, "رقم التليفون مطلوب").max(40),
  category_id: z.string().trim().max(60).optional(),
  specialty: z.string().trim().max(120).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  working_hours: z.string().trim().max(200).optional(),
  submitter_note: z.string().trim().max(600).optional(),
});

const empty = {
  name: "",
  address: "",
  landmark: "",
  phone: "",
  category_id: "",
  specialty: "",
  whatsapp: "",
  working_hours: "",
  submitter_note: "",
};

function SuggestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [extraPhones, setExtraPhones] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
        setErrors(next);
        throw new Error("invalid");
      }
      setErrors({});
      const d = parsed.data;
      // Build extra_phones array from non-empty extra phone fields (label is empty — admin assigns later)
      const extra = extraPhones
        .map((n) => n.trim())
        .filter(Boolean)
        .map((number) => ({ number, label: "" }));
      await submitSuggestion({
        name: d.name,
        address: d.address,
        landmark: d.landmark,
        phone: d.phone,
        extra_phones: extra.length > 0 ? extra : null,
        category_id: d.category_id || null,
        specialty: d.specialty || null,
        whatsapp: d.whatsapp || null,
        working_hours: d.working_hours || null,
        submitter_note: d.submitter_note || null,
        status: "pending",
      });
    },
    onSuccess: () => {
      toast.success("متشكرين! الاقتراح وصلنا وهنراجعه.");
      setForm(empty);
      setExtraPhones([]);
      navigate({ to: "/" });
    },
    onError: (error) => {
      if (error.message === "invalid") {
        toast.error("كمّل الحقول المطلوبة الأول.");
        return;
      }
      toast.error("الاقتراح مبعتش. جرّب تاني.");
    },
  });

  const set = (key: keyof typeof empty) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
            ضيف عيادة
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pt-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-extrabold leading-snug">ضيف عيادة للدليل</h1>
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            الحقول المطلوبة عليها{" "}
            <span className="font-bold text-destructive">*</span> — الباقي اختياري بتفيدنا.
          </p>
        </div>

        {/* ── Form ── */}
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {/* Required fields */}
          <div className="space-y-5">
            <Field label="اسم العيادة" required error={errors["name"]}>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="مثلاً: عيادة د. محمد عبدالله"
                className="h-13 rounded-2xl text-base"
                aria-required="true"
              />
            </Field>

            <Field label="العنوان" required error={errors["address"]}>
              <Input
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
                placeholder="الشارع والحي والمدينة"
                className="h-13 rounded-2xl text-base"
                aria-required="true"
              />
            </Field>



            <Field label="رقم التليفون" required error={errors["phone"]}>
              <Input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                inputMode="tel"
                dir="ltr"
                placeholder="010xxxxxxxx"
                className="h-13 rounded-2xl text-base text-start"
                aria-required="true"
              />
            </Field>

            {/* Extra phones — no labels (admin assigns later) */}
            <div className="space-y-3">
              <p className="text-sm font-bold">
                أرقام إضافية
                <span className="ms-1.5 text-sm font-normal text-muted-foreground">(اختياري)</span>
              </p>
              {extraPhones.map((num, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={num}
                    onChange={(e) =>
                      setExtraPhones((prev) =>
                        prev.map((p, idx) => (idx === i ? e.target.value : p))
                      )
                    }
                    inputMode="tel"
                    dir="ltr"
                    placeholder="010xxxxxxxx"
                    className="h-13 flex-1 rounded-2xl text-base text-start"
                    aria-label={`رقم إضافي ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => setExtraPhones((prev) => prev.filter((_, idx) => idx !== i))}
                    className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    aria-label={`حذف الرقم الإضافي ${i + 1}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExtraPhones((prev) => [...prev, ""])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <PlusCircle className="h-4 w-4" />
                ضيف رقم إضافي
              </button>
            </div>
          </div>

          {/* Optional fields — collapsible */}
          <div className="rounded-2xl border-2 border-dashed border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-bold text-muted-foreground hover:bg-muted/50 transition-colors"
              aria-expanded={showOptional}
            >
              <span>تفاصيل اختيارية (بتساعدنا أكتر)</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  showOptional && "rotate-180",
                )}
              />
            </button>

            {showOptional && (
              <div className="border-t border-dashed border-border px-5 pb-5 pt-4 space-y-5">
                <Field label="علامة مميزة جنبها" hint="بتساعد الناس يلاقوا المكان بسهولة">
                  <Input
                    value={form.landmark}
                    onChange={(e) => set("landmark")(e.target.value)}
                    placeholder="مثلاً: جنب الصيدلية الزرقا أو قدام البنك"
                    className="h-13 rounded-2xl text-base"
                  />
                </Field>

                <Field label="القسم">
                  <div className="relative">
                    <select
                      value={form.category_id}
                      onChange={(e) => set("category_id")(e.target.value)}
                      aria-label="القسم"
                      className="h-13 w-full appearance-none rounded-2xl border border-input bg-background px-4 text-base"
                    >
                      <option value="">مش متأكد</option>
                      {(categories.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 end-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>

                <Field label="التخصص التفصيلي">
                  <Input
                    value={form.specialty}
                    onChange={(e) => set("specialty")(e.target.value)}
                    placeholder="مثلاً: أسنان أطفال، جلدية وتجميل"
                    className="h-13 rounded-2xl text-base"
                  />
                </Field>

                <Field label="رقم الواتساب">
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp")(e.target.value)}
                    inputMode="tel"
                    dir="ltr"
                    placeholder="010xxxxxxxx"
                    className="h-13 rounded-2xl text-base text-start"
                  />
                </Field>

                <Field label="مواعيد الشغل">
                  <Input
                    value={form.working_hours}
                    onChange={(e) => set("working_hours")(e.target.value)}
                    placeholder="السبت–الخميس ١٠ص–١٠م"
                    className="h-13 rounded-2xl text-base"
                  />
                </Field>

                <Field label="أي حاجة تحب تقولها لنا">
                  <Textarea
                    value={form.submitter_note}
                    onChange={(e) => set("submitter_note")(e.target.value)}
                    placeholder="أي ملاحظة إضافية..."
                    className="min-h-28 rounded-2xl text-base resize-none"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="h-15 w-full rounded-2xl text-base font-bold shadow-md shadow-primary/25 transition-all"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                بيتبعت…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                ابعت الاقتراح
              </span>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground pb-2">
            مش محتاج تسجيل — اقتراحك هيوصلنا مباشرة 🙏
          </p>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-bold mb-1.5 block">
        {label}
        {required ? (
          <span className="ms-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {hint ? (
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{hint}</p>
      ) : null}
      <div>{children}</div>
      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-destructive" role="alert">
          <span>⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
