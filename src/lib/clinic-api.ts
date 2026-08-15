import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Clinic = Tables<"clinics">;
export type Suggestion = Tables<"suggestions">;
export type Category = Tables<"categories">;
export type ClinicInput = TablesInsert<"clinics">;
export type ClinicPatch = TablesUpdate<"clinics">;

export const CLINICS_PAGE_SIZE = 10;

export interface FetchClinicsParams {
  page: number;          // 0-indexed
  search?: string;       // free-text search
  categoryId?: string;   // filter by category
}

export interface FetchClinicsResult {
  data: Clinic[];
  totalCount: number;
  hasMore: boolean;
}

export async function searchClinicsFuzzy(
  searchQuery: string,
  categoryId?: string | null
): Promise<Clinic[]> {
  const { data, error } = await supabase.rpc("search_clinics_fuzzy", {
    search_query: searchQuery.trim(),
    filter_category_id: categoryId || null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClinics(
  { page, search, categoryId }: FetchClinicsParams = { page: 0 }
): Promise<FetchClinicsResult> {
  const from = page * CLINICS_PAGE_SIZE;
  const to   = from + CLINICS_PAGE_SIZE - 1;

  const trimmed = search?.trim();

  let query;
  if (trimmed) {
    // High-performance fuzzy & normalized search via RPC
    query = supabase
      .rpc("search_clinics_fuzzy", {
        search_query: trimmed,
        filter_category_id: categoryId || null,
      })
      .select("*", { count: "exact" })
      .range(from, to);
  } else {
    // Default chronological/sort_order listing when no search term
    query = supabase
      .from("clinics")
      .select("*", { count: "exact" })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: data ?? [],
    totalCount,
    hasMore: from + CLINICS_PAGE_SIZE < totalCount,
  };
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

export async function submitSuggestion(input: TablesInsert<"suggestions">): Promise<string> {
  const { data, error } = await supabase
    .from("suggestions")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
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

export async function fetchAllClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function reorderClinicSmart(clinicId: string, newOrder: number): Promise<void> {
  const { error } = await supabase.rpc("reorder_clinic_smart", {
    target_clinic_id: clinicId,
    new_order: newOrder,
  });
  if (error) throw error;
}

export async function randomizeClinicsOrder(): Promise<void> {
  const { error } = await supabase.rpc("randomize_clinics_order", {});
  if (error) throw error;
}

export async function resequenceClinics(clinicIds: string[]): Promise<void> {
  const { error } = await supabase.rpc("resequence_clinics", {
    clinic_ids: clinicIds,
  });
  if (error) throw error;
}

export async function createClinic(input: ClinicInput, desiredOrder?: number) {
  const { data, error } = await supabase
    .from("clinics")
    .insert({ ...input, sort_order: desiredOrder ?? 999999 })
    .select("id")
    .single();
  if (error) throw error;

  if (desiredOrder !== undefined && desiredOrder > 0) {
    await reorderClinicSmart(data.id, desiredOrder);
  } else {
    await reorderClinicSmart(data.id, 999999);
  }
}

export async function updateClinic(id: string, patch: ClinicPatch, desiredOrder?: number) {
  const { error } = await supabase.from("clinics").update(patch).eq("id", id);
  if (error) throw error;

  if (desiredOrder !== undefined && desiredOrder > 0) {
    await reorderClinicSmart(id, desiredOrder);
  }
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
