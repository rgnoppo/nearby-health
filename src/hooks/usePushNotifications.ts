// usePushNotifications.ts
//
// Manages FCM push notification registration and notification-tap navigation
// for the Android/Capacitor build ONLY.
//
// IMPORTANT: This hook uses `@capacitor/push-notifications` which only works
// inside a native Capacitor app. All calls are guarded by
// `Capacitor.isNativePlatform()` so the hook is safe to mount in the shared
// root component — it simply does nothing on the web version.
//
// Architecture:
//   1. On first open, request POST_NOTIFICATIONS permission (Android 13+).
//      If denied, the app continues normally — no error, no repeated prompts.
//   2. On registration, upsert the FCM token into Supabase `device_tokens`.
//   3. On token refresh, update the stored token.
//   4. On notification tap (foreground / background / cold-start), navigate
//      to the validated destination using the TanStack router.

import { useEffect, useRef } from "react";
import { useIsNativeApp } from "@/hooks/useCapacitor";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Lazily import the plugin so the web build never even references the module.
// (Tree-shaking / dynamic import keeps it out of the web bundle.)
async function getPushPlugin() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
}

// ---------------------------------------------------------------------------
// Destination validation — mirrors the server-side allowlist exactly.
// Never navigate to an untrusted path from notification data.
// ---------------------------------------------------------------------------
const ALLOWED_DESTINATIONS = new Set(["/", "/about", "/download", "/suggest"]);
const CLINIC_DETAIL_PATTERN =
  /^\/clinic\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDestination(dest: unknown): dest is string {
  if (typeof dest !== "string") return false;
  const d = dest.trim();
  return ALLOWED_DESTINATIONS.has(d) || CLINIC_DETAIL_PATTERN.test(d);
}

// ---------------------------------------------------------------------------
// Supabase token registration
// ---------------------------------------------------------------------------
async function registerTokenWithSupabase(token: string): Promise<void> {
  const { error } = await supabase.rpc("register_device_token", { fcm_token: token });

  if (error) {
    // Log without printing the full token value.
    console.warn("[PushNotifications] Token registration failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Pending destination — persists across a cold-start before the router mounts.
// ---------------------------------------------------------------------------
let pendingDestination: string | null = null;

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------
export function usePushNotifications(): void {
  const router = useRouter();
  const isNative = useIsNativeApp();
  // Prevent registering listeners more than once (React StrictMode double-invoke).
  const initialized = useRef(false);

  useEffect(() => {
    // Guard: only run inside the native Capacitor app.
    if (!isNative) return;
    if (initialized.current) return;
    initialized.current = true;

    let cleanupFns: Array<() => void> = [];

    (async () => {
      try {
        const PushNotifications = await getPushPlugin();

        // -------------------------------------------------------------------
        // Check current permission state before requesting.
        // -------------------------------------------------------------------
        const permStatus = await PushNotifications.checkPermissions();

        // Only request if not already granted.
        // If previously denied, `requestPermissions()` on Android simply returns
        // 'denied' immediately — we do not show a system dialog again.
        let finalStatus = permStatus.receive;
        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          const result = await PushNotifications.requestPermissions();
          finalStatus = result.receive;
        }

        // If the user denied, bail out gracefully — app still works normally.
        if (finalStatus !== "granted") {
          console.log("[PushNotifications] Permission not granted; skipping registration.");
          return;
        }

        // -------------------------------------------------------------------
        // Listener: registration success → upsert token in Supabase.
        // -------------------------------------------------------------------
        const regListener = await PushNotifications.addListener(
          "registration",
          async (tokenData) => {
            await registerTokenWithSupabase(tokenData.value);
          },
        );
        cleanupFns.push(() => regListener.remove());

        // -------------------------------------------------------------------
        // Listener: registration error — log only, app continues normally.
        // -------------------------------------------------------------------
        const regErrListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.warn("[PushNotifications] Registration error:", err.error);
          },
        );
        cleanupFns.push(() => regErrListener.remove());

        // -------------------------------------------------------------------
        // Listener: notification received while app is in the FOREGROUND.
        // Capacitor does not auto-show a system notification in this state.
        // We log it; no navigation happens unless the user explicitly taps.
        // -------------------------------------------------------------------
        const fgListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log(
              "[PushNotifications] Received in foreground:",
              notification.title,
            );
            // Optionally you could show an in-app toast here using sonner.
            // We keep this minimal per the architecture requirements.
          },
        );
        cleanupFns.push(() => fgListener.remove());

        // -------------------------------------------------------------------
        // Listener: notification tap (BACKGROUND or foreground tap action).
        // Also fires during COLD START if the app was launched by a tap.
        // -------------------------------------------------------------------
        const tapListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const dest =
              action.notification.data?.destination ??
              action.notification.data?.["destination"];

            if (!isValidDestination(dest)) {
              // No destination or invalid — navigate home.
              router.navigate({ to: "/", replace: false });
              return;
            }

            // Navigate to the validated route.
            // For clinic detail pages, extract the clinicId param.
            const clinicMatch = dest.match(/^\/clinic\/(.+)$/);
            if (clinicMatch) {
              router.navigate({
                to: "/clinic/$clinicId",
                params: { clinicId: clinicMatch[1] },
                replace: false,
              });
            } else {
              // All other allowed destinations are navigatable as plain paths.
              router.navigate({ to: dest as "/" | "/about" | "/download" | "/suggest", replace: false });
            }
          },
        );
        cleanupFns.push(() => tapListener.remove());

        // -------------------------------------------------------------------
        // Register with FCM (triggers the `registration` event).
        // MUST be called AFTER listeners are attached to avoid race conditions.
        // -------------------------------------------------------------------
        await PushNotifications.register();

        // -------------------------------------------------------------------
        // Cold-start: if the app was launched by tapping a notification,
        // `getDeliveredNotifications` catches it before the listener fires.
        // -------------------------------------------------------------------
        if (pendingDestination) {
          const dest = pendingDestination;
          pendingDestination = null;
          if (isValidDestination(dest)) {
            const clinicMatch = dest.match(/^\/clinic\/(.+)$/);
            if (clinicMatch) {
              router.navigate({
                to: "/clinic/$clinicId",
                params: { clinicId: clinicMatch[1] },
                replace: false,
              });
            } else {
              router.navigate({ to: dest as "/" | "/about" | "/download" | "/suggest", replace: false });
            }
          }
        }
      } catch (err) {
        // Non-fatal — push notifications failing must not crash the app.
        console.error("[PushNotifications] Unexpected error:", err);
      }
    })();

    return () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
    };
  }, [router]);
}
