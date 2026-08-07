import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TablesInsert } from "@/integrations/supabase/types";

const verifyTurnstile = async (token: string, ip?: string) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is missing, skipping verification (dev mode)");
    return true;
  }

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (ip) {
    formData.append("remoteip", ip);
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return data.success;
};

// Define a simple schema to accept the same input + token
const inputSchema = z.object({
  token: z.string().min(1, "Turnstile token is missing"),
  suggestion: z.any(), // In a real app we might strongly type this, but any is fine for passing to supabase
});

export const submitSuggestionSecure = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const isHuman = await verifyTurnstile(data.token);
    if (!isHuman) {
      throw new Error("Turnstile verification failed. Please try again.");
    }

    const { supabase } = await import("@/integrations/supabase/client");
    const suggestionInput = data.suggestion as TablesInsert<"suggestions">;

    const { data: result, error } = await supabase
      .from("suggestions")
      .insert(suggestionInput)
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message ?? "Could not submit suggestion");
    }

    return result.id as string;
  });
