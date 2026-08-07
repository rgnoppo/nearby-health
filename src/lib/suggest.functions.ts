import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TablesInsert } from "@/integrations/supabase/types";

// ─── Turnstile verification ───────────────────────────────────────────────────
const verifyTurnstile = async (token: string, ip?: string) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.VITE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY is missing — skipping verification (dev mode).");
    return true;
  }

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  let cfRes: Response;
  try {
    cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
  } catch (networkErr) {
    console.error("[Turnstile] Network error contacting Cloudflare siteverify:", networkErr);
    return false;
  }

  if (!cfRes.ok) {
    console.error(`[Turnstile] Cloudflare siteverify returned HTTP ${cfRes.status}`);
    return false;
  }

  const cfData = await cfRes.json();
  if (!cfData.success) {
    console.error("[Turnstile] Verification failed. Cloudflare error-codes:", cfData["error-codes"]);
  }
  return cfData.success === true;
};

// ─── Input schema ─────────────────────────────────────────────────────────────
const inputSchema = z.object({
  token: z.string().min(1, "Turnstile token is missing"),
  suggestion: z.any(),
});

// ─── Server function ──────────────────────────────────────────────────────────
export const submitSuggestionSecure = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Verify the Turnstile token first
    const isHuman = await verifyTurnstile(data.token);
    if (!isHuman) {
      throw new Error("Turnstile verification failed. Please try again.");
    }

    // 2. Use the SERVICE-ROLE admin client if available, otherwise fallback to anon client
    let supabaseClient;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      supabaseClient = supabaseAdmin;
    } else {
      console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing in environment. Falling back to anon client.");
      const { supabase } = await import("@/integrations/supabase/client");
      supabaseClient = supabase;
    }

    const suggestionInput = data.suggestion as TablesInsert<"suggestions">;

    const { data: result, error } = await supabaseClient
      .from("suggestions")
      .insert(suggestionInput)
      .select("id")
      .single();

    if (error) {
      console.error("[Supabase] suggestions.insert error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(error.message ?? "Could not submit suggestion");
    }

    return result.id as string;
  });
