import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Clinic = Tables<"clinics">;
export type Suggestion = Tables<"suggestions">;
export type Category = Tables<"categories">;
export type ClinicInput = TablesInsert<"clinics">;
export type ClinicPatch = TablesUpdate<"clinics">;

export async function fetchClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClinic(id: string): Promise<Clinic | null> {
  const { data, error } = await supabase.from("clinics").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name: string) {
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("categories")
    .insert({ name: name.trim().slice(0, 60), sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) throw error;
}

export async function updateCategory(id: string, name: string) {
  const { error } = await supabase
    .from("categories")
    .update({ name: name.trim().slice(0, 60) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function swapCategoryOrder(a: Category, b: Category) {
  const { error: e1 } = await supabase
    .from("categories")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("categories")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  if (e2) throw e2;
}

export async function submitSuggestion(input: TablesInsert<"suggestions">) {
  const { error } = await supabase.from("suggestions").insert(input);
  if (error) throw error;
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setSuggestionStatus(id: string, status: "approved" | "rejected") {
  const { error } = await supabase.from("suggestions").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function createClinic(input: ClinicInput) {
  const { data: last } = await supabase
    .from("clinics")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("clinics")
    .insert({ ...input, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) throw error;
}

export async function updateClinic(id: string, patch: ClinicPatch) {
  const { error } = await supabase.from("clinics").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteClinic(id: string) {
  const { error } = await supabase.from("clinics").delete().eq("id", id);
  if (error) throw error;
}

export async function swapClinicOrder(a: Clinic, b: Clinic) {
  const { error: e1 } = await supabase
    .from("clinics")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("clinics")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  if (e2) throw e2;
}
