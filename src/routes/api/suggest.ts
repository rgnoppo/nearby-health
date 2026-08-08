import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { TablesInsert } from "@/integrations/supabase/types";

// ─── CORS allowlist ────────────────────────────────────────────────────────
// WHY THIS ROUTE EXISTS (instead of the old `createServerFn` RPC):
// TanStack Start server functions are same-origin RPC endpoints — they're
// protected by a built-in CSRF/Origin check that REJECTS cross-origin
// requests by design (see src/start.ts: createCsrfMiddleware). The packaged
// Capacitor app runs from `capacitor://localhost`, so it can never satisfy
// that same-origin check. Rather than weakening that middleware globally
// (which would also strip CSRF protection from the admin/auth server
// functions), this one public, unauthenticated endpoint is a plain server
// route with its own narrow, explicit CORS allowlist below.
//
// SECURITY: keep this list to EXACT origins only. Never reflect an
// arbitrary request Origin and never use "*" — this route accepts
// unauthenticated POSTs that write to the database, and a wildcard would
// let any website's JS submit (spam) suggestions using a visitor's browser.
const DEFAULT_ALLOWED_ORIGINS = [
  "capacitor://localhost", // packaged Android/iOS app — capacitor:// scheme
  "https://localhost",     // packaged Android app when androidScheme:"https" (Capacitor ≥ 4)
  "http://localhost",      // Capacitor native dev / emulator (http fallback)
  "http://localhost:3000", // Capacitor live-reload dev server
  "https://localhost:3000",// Capacitor live-reload dev server (https variant)
];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.SUGGEST_API_ALLOWED_ORIGINS;
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Vary: "Origin",
  };
  if (origin && getAllowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

// ─── Turnstile verification ────────────────────────────────────────────────
const verifyTurnstile = async (token: string, ip?: string) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
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

// ─── Input schema ──────────────────────────────────────────────────────────
const bodySchema = z.object({
  token: z.string().min(1, "Turnstile token is missing"),
  suggestion: z.any(),
});

export const Route = createFileRoute("/api/suggest")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        });
      },
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const headers = { ...corsHeaders(origin), "content-type": "application/json" };

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid request body" }, { status: 400, headers });
        }

        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim();
        const isHuman = await verifyTurnstile(parsed.token, ip);
        if (!isHuman) {
          return Response.json(
            { error: "Turnstile verification failed. Please try again." },
            { status: 400, headers },
          );
        }

        let supabaseClient;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          supabaseClient = supabaseAdmin;
        } else {
          console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing in environment. Falling back to anon client.");
          const { supabase } = await import("@/integrations/supabase/client");
          supabaseClient = supabase;
        }

        const suggestionInput = parsed.suggestion as TablesInsert<"suggestions">;

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
          return Response.json(
            { error: error.message ?? "Could not submit suggestion" },
            { status: 500, headers },
          );
        }

        return Response.json({ id: result.id as string }, { status: 200, headers });
      },
    },
  },
});
