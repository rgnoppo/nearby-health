import { useState } from "react";
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Clinic } from "@/lib/clinic-api";

export type PhoneEntry = { number: string; label: string };

export type ClinicFormValues = {
  name: string;
  specialty: string;
  address: string;
  landmark: string;
  phone: string;
  extra_phones: PhoneEntry[];
  whatsapp: string;
  working_hours: string;
  notes: string;
  category_id: string;
  last_verified_at?: string | null;
};

export const emptyClinicForm: ClinicFormValues = {
  name: "",
  specialty: "",
  address: "",
  landmark: "",
  phone: "",
  extra_phones: [],
  whatsapp: "",
  working_hours: "",
  notes: "",
  category_id: "",
  last_verified_at: null,
};

export function clinicToForm(clinic: Clinic): ClinicFormValues {
  return {
    name: clinic.name,
    specialty: clinic.specialty ?? "",
    address: clinic.address,
    landmark: clinic.landmark,
    phone: clinic.phone,
    extra_phones: (clinic.extra_phones as PhoneEntry[] | null) ?? [],
    whatsapp: clinic.whatsapp ?? "",
    working_hours: clinic.working_hours,
    notes: clinic.notes ?? "",
    category_id: clinic.category_id ?? "",
    last_verified_at: clinic.last_verified_at ?? null,
  };
}

/** Mini sub-form for managing multiple phone numbers with labels (admin only) */
function PhonesEditor({
  phones,
  onChange,
}: {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
}) {
  const add = () => onChange([...phones, { number: "", label: "" }]);
  const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof PhoneEntry, value: string) =>
    onChange(phones.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">
        أرقام إضافية
        <span className="ms-1.5 text-muted-foreground font-normal">(اختياري)</span>
      </Label>
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={p.number}
            onChange={(e) => update(i, "number", e.target.value)}
            placeholder="010xxxxxxxx"
            dir="ltr"
            className="h-10 flex-1 rounded-xl text-start text-sm"
            aria-label={`رقم إضافي ${i + 1}`}
          />
          <Input
            value={p.label}
            onChange={(e) => update(i, "label", e.target.value)}
            placeholder="مثلاً: حجز، طوارئ"
            className="h-10 flex-1 rounded-xl text-sm"
            maxLength={40}
            aria-label={`مسمى الرقم الإضافي ${i + 1}`}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => remove(i)}
            aria-label={`حذف الرقم الإضافي ${i + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 rounded-xl w-full"
        onClick={add}
      >
        <PlusCircle className="h-4 w-4" />
        ضيف رقم إضافي
      </Button>
    </div>
  );
}

export function ClinicForm({
  initial,
  categories,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: ClinicFormValues;
  categories: Category[];
  submitLabel: string;
  pending?: boolean;
  onSubmit: (values: ClinicFormValues) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = (key: keyof Omit<ClinicFormValues, "extra_phones">) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const requiredOk =
    values.name.trim() &&
    values.address.trim() &&
    values.landmark.trim() &&
    values.phone.trim() &&
    values.working_hours.trim();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!requiredOk) return;
        onSubmit(values);
      }}
    >
      {(
        [
          ["name", "اسم العيادة", true],
          ["specialty", "التخصص التفصيلي", false],
          ["address", "العنوان", true],
          ["landmark", "العلامة المميزة", true],
          ["phone", "التليفون الرئيسي", true],
          ["whatsapp", "واتساب", false],
          ["working_hours", "مواعيد الشغل", true],
        ] as const
      ).map(([key, label, required]) => (
        <div key={key}>
          <Label htmlFor={`clinic-${key}`} className="text-xs font-semibold">
            {label}
            {required ? <span className="ms-1 text-destructive">*</span> : null}
          </Label>
          <Input
            id={`clinic-${key}`}
            value={values[key]}
            onChange={(e) => set(key)(e.target.value)}
            required={required}
            className="mt-1 h-11 rounded-xl"
          />
        </div>
      ))}

      {/* Extra phones with labels — admin only */}
      <PhonesEditor
        phones={values.extra_phones}
        onChange={(phones) => setValues((prev) => ({ ...prev, extra_phones: phones }))}
      />

      <div>
        <Label htmlFor="clinic-category" className="text-xs font-semibold">
          القسم
        </Label>
        <select
          id="clinic-category"
          value={values.category_id}
          onChange={(e) => set("category_id")(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">من غير قسم</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="clinic-notes" className="text-xs font-semibold">
          ملاحظات
        </Label>
        <Textarea
          id="clinic-notes"
          value={values.notes}
          onChange={(e) => set("notes")(e.target.value)}
          className="mt-1 min-h-20 rounded-xl"
        />
      </div>

      <div className="pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setValues(prev => ({ ...prev, last_verified_at: new Date().toISOString() }))}
          className="w-full h-11 rounded-xl font-bold border-green-500 text-green-700 hover:bg-green-50"
        >
          {values.last_verified_at && new Date(values.last_verified_at) > new Date(Date.now() - 10000) 
            ? "✅ تم تأكيد التحديث للتو!"
            : "تأكيد وتحديث تاريخ البيانات للآن"}
        </Button>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={pending}>
          {pending ? "بيتسجّل…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={onCancel}>
            إلغاء
          </Button>
        ) : null}
      </div>
    </form>
  );
}
