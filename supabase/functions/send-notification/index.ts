// Supabase Edge Function: send-notification
//
// Receives a notification request from the authenticated Admin web UI,
// verifies the admin's identity server-side, then broadcasts to all
// registered FCM device tokens via Firebase Cloud Messaging HTTP v1 API.
//
// SECURITY:
//  - Firebase service-account credentials live ONLY here (Supabase secret).
//  - No FCM credentials are ever sent to the browser or bundled in the APK.
//  - Admin authorization is re-verified here — hiding the UI button is not enough.
//  - Notification destination is validated against a strict allowlist.
//  - Only authenticated admins may call this function.
//
// Required Supabase secrets (set with `supabase secrets set`):
//   SUPABASE_URL           — auto-provided by Supabase runtime
//   SUPABASE_ANON_KEY      — auto-provided by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY — auto-provided by Supabase runtime
//   FCM_SERVICE_ACCOUNT_JSON — full JSON of the Firebase service account key file

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ---------------------------------------------------------------------------
// Allowed navigation destinations inside the app.
// These match the routes defined in src/routes.capacitor/.
// Adding arbitrary paths here is a security decision — keep this list minimal.
// ---------------------------------------------------------------------------
const ALLOWED_DESTINATIONS = new Set([
  "/",
  "/about",
  "/download",
  "/suggest",
]);

// Clinic detail pages follow the pattern /clinic/<uuid>
const CLINIC_DETAIL_PATTERN = /^\/clinic\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates and sanitizes a notification destination.
 * Returns null if the destination is not allowed (caller should treat as "home").
 */
function sanitizeDestination(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const dest = raw.trim();
  if (ALLOWED_DESTINATIONS.has(dest)) return dest;
  if (CLINIC_DETAIL_PATTERN.test(dest)) return dest;
  // Unknown destination — fall back to home silently.
  return null;
}

// ---------------------------------------------------------------------------
// Google OAuth2 — get an access token for FCM using the service account key.
// Uses the RS256 JWT grant flow (no external library needed in Deno).
// ---------------------------------------------------------------------------
async function getFirebaseAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
    token_uri: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  // Build the JWT
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signingInput = `${header}.${payload}`;

  // Import the private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signingInput),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${signingInput}.${sigB64}`;

  // Exchange the JWT for an access token
  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Firebase access token: ${errText}`);
  }
  const tokenData = await tokenRes.json() as { access_token: string };
  return tokenData.access_token;
}

// ---------------------------------------------------------------------------
// Send one FCM message to a specific token via FCM HTTP v1 API.
// Returns true on success, false on token-gone errors (404/410).
// Throws on unexpected errors.
// ---------------------------------------------------------------------------
async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  destination: string | null,
): Promise<{ success: boolean; tokenGone: boolean }> {
  const message: Record<string, unknown> = {
    token,
    notification: { title, body },
    // data payload carries the optional navigation destination.
    // Validated server-side before sending; never executed as code on device.
    data: destination ? { destination } : {},
    android: {
      priority: "high",
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );

  if (res.ok) return { success: true, tokenGone: false };

  const status = res.status;
  // 404 = token not found, 410 = token expired/unregistered — both mean
  // the device is gone and the token should be removed.
  if (status === 404 || status === 410) {
    return { success: false, tokenGone: true };
  }

  const errText = await res.text();
  // Log without printing the token itself in production.
  console.error(`FCM send failed (status=${status}):`, errText.slice(0, 300));
  return { success: false, tokenGone: false };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Verify the caller is an authenticated admin.
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing required Supabase environment variables");
    }

    // Verify the user JWT with the anon-key client (respects RLS).
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verify admin role using service-role client (bypasses RLS for this check).
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // -----------------------------------------------------------------------
    // 2. Parse and validate the request body.
    // -----------------------------------------------------------------------
    let body: { title?: unknown; body?: unknown; destination?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const notifBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || !notifBody) {
      return new Response(
        JSON.stringify({ error: "Both title and body are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    if (title.length > 200 || notifBody.length > 500) {
      return new Response(
        JSON.stringify({ error: "title must be ≤200 chars, body must be ≤500 chars" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const destination = sanitizeDestination(
      typeof body.destination === "string" ? body.destination : null,
    );

    // -----------------------------------------------------------------------
    // 3. Load FCM credentials from secrets.
    // -----------------------------------------------------------------------
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";
    if (!serviceAccountJson) {
      throw new Error("FCM_SERVICE_ACCOUNT_JSON secret is not configured");
    }

    let projectId: string;
    try {
      const sa = JSON.parse(serviceAccountJson) as { project_id?: string };
      projectId = sa.project_id ?? "";
      if (!projectId) throw new Error("project_id missing from service account JSON");
    } catch (e) {
      throw new Error(`Invalid FCM_SERVICE_ACCOUNT_JSON: ${(e as Error).message}`);
    }

    // -----------------------------------------------------------------------
    // 4. Fetch all registered device tokens.
    // -----------------------------------------------------------------------
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from("device_tokens")
      .select("id, token")
      .eq("platform", "android");

    if (tokenError) throw new Error(`Failed to fetch device tokens: ${tokenError.message}`);
    if (!tokenRows || tokenRows.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, failed: 0, message: "No registered devices" }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // 5. Get Firebase access token (one JWT exchange for all sends).
    // -----------------------------------------------------------------------
    const accessToken = await getFirebaseAccessToken(serviceAccountJson);

    // -----------------------------------------------------------------------
    // 6. Send to all tokens; collect gone tokens for cleanup.
    // -----------------------------------------------------------------------
    let sent = 0;
    let failed = 0;
    const goneIds: string[] = [];

    // Send in small batches to avoid overwhelming FCM.
    const BATCH = 50;
    for (let i = 0; i < tokenRows.length; i += BATCH) {
      const batch = tokenRows.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (row) => {
          const result = await sendFcmMessage(
            accessToken,
            projectId,
            row.token,
            title,
            notifBody,
            destination,
          );
          if (result.success) {
            sent++;
          } else {
            failed++;
            if (result.tokenGone) goneIds.push(row.id);
          }
        }),
      );
    }

    // -----------------------------------------------------------------------
    // 7. Clean up expired/invalid tokens.
    // -----------------------------------------------------------------------
    if (goneIds.length > 0) {
      await supabaseAdmin
        .from("device_tokens")
        .delete()
        .in("id", goneIds);
      console.log(`Removed ${goneIds.length} expired/invalid FCM token(s)`);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, devices: tokenRows.length }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-notification error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
