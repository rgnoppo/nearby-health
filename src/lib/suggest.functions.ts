import { getApiOrigin } from "@/lib/api-base";
import type { TablesInsert } from "@/integrations/supabase/types";

type SubmitSuggestionInput = {
  token: string;
  suggestion: TablesInsert<"suggestions">;
};

// Plain HTTP call to the `/api/suggest` server route (see
// src/routes/api/suggest.ts) rather than a TanStack Start server-function
// RPC. Server functions enforce a same-origin check, which the packaged
// Capacitor app (origin `capacitor://localhost`) can never pass — see the
// comment at the top of src/routes/api/suggest.ts for the full reasoning.
//
// On the web build `getApiOrigin()` returns "", so this is a normal
// same-origin fetch exactly like before. On the native build it resolves to
// the deployed Vercel origin.
export async function submitSuggestionSecure({
  data,
}: {
  data: SubmitSuggestionInput;
}): Promise<string> {
  const res = await fetch(`${getApiOrigin()}/api/suggest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });

  let payload: { id?: string; error?: string } | null = null;
  try {
    payload = await res.json();
  } catch {
    // no/invalid JSON body — fall through to the !res.ok handling below
  }

  if (!res.ok || !payload?.id) {
    throw new Error(payload?.error ?? "Could not submit suggestion");
  }

  return payload.id;
}
