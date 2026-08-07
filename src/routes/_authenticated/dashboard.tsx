import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import Check from "lucide-react/dist/esm/icons/check";
import Home from "lucide-react/dist/esm/icons/home";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import Hash from "lucide-react/dist/esm/icons/hash";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  ClinicForm,
  clinicToForm,
  emptyClinicForm,
  type ClinicFormValues,
} from "@/components/admin/ClinicForm";
import {
  createCategory,
  createClinic,
  deleteCategory,
  deleteClinic,
  fetchCategories,
  fetchClinics,
  fetchSuggestions,
  setSuggestionStatus,
  swapCategoryOrder,
  swapClinicOrder,
  updateCategory,
  updateClinic,
  type Category,
  type Clinic,
  type Suggestion,
} from "@/lib/clinic-api";

/** Convert a UUID to the same short code shown to the user (e.g. REQ-8X29B) */
function toRequestCode(uuid: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const hex = uuid.replace(/-/g, "").slice(0, 8);
  const num = parseInt(hex, 16);
  let code = "";
  let n = num;
  for (let i = 0; i < 5; i++) {
    code = chars[n % chars.length] + code;
    n = Math.floor(n / chars.length);
  }
  return `REQ-${code}`;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const clinics = useQuery({ queryKey: ["clinics"], queryFn: fetchClinics });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const suggestions = useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestions,
    enabled: isAdmin.data === true,
  });

  const [mode, setMode] = useState<{ kind: "none" | "new" } | { kind: "edit"; clinic: Clinic }>({
    kind: "none",
  });
  const [activeTab, setActiveTab] = useState("clinics");
  const [prefill, setPrefill] = useState<ClinicFormValues | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isAdmin.data === false) toast.error("الحساب ده مش أدمن.");
  }, [isAdmin.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["clinics"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["suggestions"] });
  };

  const save = useMutation({
    mutationFn: async (values: ClinicFormValues) => {
      const payload = {
        name: values.name.trim(),
        specialty: values.specialty.trim() || null,
        address: values.address.trim(),
        landmark: values.landmark.trim(),
        phone: values.phone.trim(),
        extra_phones: values.extra_phones.filter((p) => p.number.trim()).length > 0
          ? values.extra_phones
              .filter((p) => p.number.trim())
              .map((p) => ({ number: p.number.trim(), label: p.label.trim() }))
          : null,
        whatsapp: values.whatsapp.trim() || null,
        working_hours: values.working_hours.trim(),
        notes: values.notes.trim() || null,
        category_id: values.category_id || null,
      };
      if (mode.kind === "edit") await updateClinic(mode.clinic.id, payload);
      else await createClinic(payload);
      if (approvingId) await setSuggestionStatus(approvingId, "approved");
    },
    onSuccess: () => {
      toast.success(mode.kind === "edit" ? "تم تحديث العيادة." : "تمت إضافة العيادة.");
      setMode({ kind: "none" });
      setPrefill(null);
      setApprovingId(null);
      invalidate();
    },
    onError: () => toast.error("مقدرناش نحفظ العيادة."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteClinic(id),
    onSuccess: () => {
      toast.success("تم حذف العيادة.");
      invalidate();
    },
    onError: () => toast.error("مقدرناش نحذف العيادة."),
  });

  const reorder = useMutation({
    mutationFn: ({ a, b }: { a: Clinic; b: Clinic }) => swapClinicOrder(a, b),
    onSuccess: invalidate,
    onError: () => toast.error("مقدرناش نرتّب القايمة."),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      setSuggestionStatus(id, status),
    onSuccess: () => {
      toast.success("تم تحديث الاقتراح.");
      invalidate();
    },
    onError: () => toast.error("مقدرناش نحدّث الاقتراح."),
  });

  const addCategory = useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () => {
      setNewCategory("");
      toast.success("تمت إضافة القسم.");
      invalidate();
    },
    onError: () => toast.error("مقدرناش نضيف القسم. يمكن الاسم مكرر."),
  });

  const renameCategory = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory(id, name),
    onSuccess: () => {
      setEditingCategory(null);
      toast.success("تم تعديل القسم.");
      invalidate();
    },
    onError: () => toast.error("مقدرناش نعدّل القسم."),
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success("تم حذف القسم.");
      invalidate();
    },
    onError: () => toast.error("مقدرناش نحذف القسم."),
  });

  const reorderCategory = useMutation({
    mutationFn: ({ a, b }: { a: Category; b: Category }) => swapCategoryOrder(a, b),
    onSuccess: invalidate,
    onError: () => toast.error("مقدرناش نرتّب الأقسام."),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/edara-8f3a2c", replace: true });
  };

  const startApprove = (s: Suggestion, edit: boolean) => {
    setPrefill({
      name: s.name,
      specialty: s.specialty ?? "",
      address: s.address,
      landmark: s.landmark,
      phone: s.phone,
      extra_phones: (s.extra_phones as { number: string; label: string }[] | null) ?? [],
      whatsapp: s.whatsapp ?? "",
      working_hours: s.working_hours ?? "",
      notes: s.notes ?? "",
      category_id: s.category_id ?? "",
    });
    setApprovingId(s.id);
    setMode({ kind: "new" });
    setActiveTab("clinics");
    if (!edit) toast.info("راجع البيانات وبعدين احفظ لنشر العيادة.");
  };

  if (isAdmin.isLoading) {
    return <p className="mx-auto max-w-lg p-6 text-sm text-muted-foreground">بيحمّل…</p>;
  }

  if (!isAdmin.data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="mt-3 text-lg font-bold">مفيش صلاحية إدارة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الحساب ده مش مسموح له يدير الدليل.
        </p>
        <Button className="mt-4 h-11 rounded-xl" onClick={signOut}>
          خروج
        </Button>
      </div>
    );
  }

  const list = clinics.data ?? [];
  const categoryList = categories.data ?? [];
  const categoryNames = new Map(categoryList.map((c) => [c.id, c.name] as const));
  const pendingSuggestions = (suggestions.data ?? []).filter((s) => s.status === "pending");
  const handledSuggestions = (suggestions.data ?? []).filter((s) => s.status !== "pending");

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">لوحة الإدارة</h1>
            <p className="truncate text-xs text-muted-foreground">
              {list.length} عيادة · {pendingSuggestions.length} اقتراح مستني
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-full" onClick={() => navigate({ to: "/" })}>
              <Home className="h-4 w-4" /> الرئيسية
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full" onClick={signOut}>
              <LogOut className="h-4 w-4" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="clinics">العيادات</TabsTrigger>
            <TabsTrigger value="categories">الأقسام</TabsTrigger>
            <TabsTrigger value="suggestions">
              الاقتراحات
              {pendingSuggestions.length > 0 ? (
                <Badge className="ms-1.5">{pendingSuggestions.length}</Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinics" className="mt-4 space-y-3">
            {mode.kind === "none" ? (
              <Button
                className="h-12 w-full rounded-xl"
                onClick={() => {
                  setPrefill(emptyClinicForm);
                  setApprovingId(null);
                  setMode({ kind: "new" });
                }}
              >
                <Plus className="h-4 w-4" /> ضيف عيادة
              </Button>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h2 className="mb-3 text-sm font-bold">
                  {mode.kind === "edit" ? "تعديل عيادة" : "عيادة جديدة"}
                </h2>
                <ClinicForm
                  initial={
                    mode.kind === "edit" ? clinicToForm(mode.clinic) : (prefill ?? emptyClinicForm)
                  }
                  categories={categoryList}
                  submitLabel={mode.kind === "edit" ? "حفظ التعديلات" : "ضيف العيادة"}
                  pending={save.isPending}
                  onSubmit={(values) => save.mutate(values)}
                  onCancel={() => {
                    setMode({ kind: "none" });
                    setPrefill(null);
                    setApprovingId(null);
                  }}
                />
              </div>
            )}

            <ul className="space-y-2">
              {list.map((clinic, index) => (
                <li
                  key={clinic.id}
                  className="rounded-2xl border border-border bg-card p-3 shadow-card"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{clinic.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {clinic.landmark}
                        {clinic.category_id ? ` · ${categoryNames.get(clinic.category_id) ?? ""}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`تحريك ${clinic.name} لفوق`}
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => reorder.mutate({ a: clinic, b: list[index - 1]! })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`تحريك ${clinic.name} لتحت`}
                        disabled={index === list.length - 1 || reorder.isPending}
                        onClick={() => reorder.mutate({ a: clinic, b: list[index + 1]! })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => setMode({ kind: "edit", clinic })}
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        if (confirm(`تحذف ${clinic.name}؟`)) remove.mutate(clinic.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> حذف
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="categories" className="mt-4 space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newCategory.trim().length < 2) {
                  toast.error("اكتب اسم القسم.");
                  return;
                }
                addCategory.mutate(newCategory);
              }}
            >
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="اسم القسم، مثلاً: أسنان"
                aria-label="اسم القسم الجديد"
                className="h-12 rounded-xl"
                maxLength={60}
              />
              <Button type="submit" className="h-12 shrink-0 rounded-xl" disabled={addCategory.isPending}>
                <Plus className="h-4 w-4" /> ضيف
              </Button>
            </form>

            {categoryList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                مفيش أقسام لسه. ضيف أول قسم فوق.
              </p>
            ) : (
              <ul className="space-y-2">
                {categoryList.map((category, index) => (
                  <li
                    key={category.id}
                    className="rounded-2xl border border-border bg-card p-3 shadow-card"
                  >
                    {editingCategory?.id === category.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editingCategory.name.trim().length < 2) return;
                          renameCategory.mutate({ id: category.id, name: editingCategory.name });
                        }}
                      >
                        <Input
                          value={editingCategory.name}
                          onChange={(e) =>
                            setEditingCategory({ id: category.id, name: e.target.value })
                          }
                          aria-label="اسم القسم"
                          className="h-11 rounded-xl"
                          maxLength={60}
                          autoFocus
                        />
                        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label="حفظ">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-xl"
                          aria-label="إلغاء"
                          onClick={() => setEditingCategory(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {list.filter((c) => c.category_id === category.id).length} عيادة
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={`تحريك ${category.name} لفوق`}
                            disabled={index === 0 || reorderCategory.isPending}
                            onClick={() =>
                              reorderCategory.mutate({ a: category, b: categoryList[index - 1]! })
                            }
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={`تحريك ${category.name} لتحت`}
                            disabled={index === categoryList.length - 1 || reorderCategory.isPending}
                            onClick={() =>
                              reorderCategory.mutate({ a: category, b: categoryList[index + 1]! })
                            }
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={`تعديل ${category.name}`}
                            onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label={`حذف ${category.name}`}
                            onClick={() => {
                              if (confirm(`تحذف قسم ${category.name}؟ العيادات هتفضل موجودة بدون قسم.`))
                                removeCategory.mutate(category.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4 space-y-3">
            {pendingSuggestions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                مفيش اقتراحات مستنية.
              </p>
            ) : (
              pendingSuggestions.map((s) => (
                <article
                  key={s.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="text-sm font-bold">{s.name}</h2>
                    <span
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground tracking-wider shrink-0"
                      title="رقم الطلب المرجعي"
                    >
                      <Hash className="h-3 w-3" />
                      {toRequestCode(s.id)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>{s.address}</p>
                    <p className="font-medium text-accent-foreground">{s.landmark}</p>
                    <p dir="ltr" className="text-start">{s.phone}</p>
                    {s.category_id ? <p>{categoryNames.get(s.category_id) ?? ""}</p> : null}
                    {s.specialty ? <p>{s.specialty}</p> : null}
                    {s.working_hours ? <p>{s.working_hours}</p> : null}
                    {s.submitter_note ? <p className="italic">«{s.submitter_note}»</p> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-lg" onClick={() => startApprove(s, false)}>
                      <Check className="h-3.5 w-3.5" /> موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-lg"
                      onClick={() => startApprove(s, true)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل وموافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                      onClick={() => decide.mutate({ id: s.id, status: "rejected" })}
                    >
                      <X className="h-3.5 w-3.5" /> رفض
                    </Button>
                  </div>
                </article>
              ))
            )}

            {handledSuggestions.length > 0 ? (
              <section className="pt-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
                  اتعامل معاها
                </h2>
                <ul className="mt-2 space-y-2">
                  {handledSuggestions.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-border bg-card px-3 py-2 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                        <Badge variant={s.status === "approved" ? "default" : "secondary"}>
                          {s.status === "approved" ? "مقبول" : "مرفوض"}
                        </Badge>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-muted-foreground tracking-wider">
                        <Hash className="h-3 w-3" />
                        {toRequestCode(s.id)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
