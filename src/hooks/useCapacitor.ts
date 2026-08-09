/**
 * IS_NATIVE — computed ONCE at module-load time (before any React render).
 *
 * Why module-level and not inside the hook?
 * This project uses SSR (TanStack Start). On the server, `window` is undefined
 * so the value is `false`. On the client:
 *   - Web build:       `window.Capacitor` is never set → `false` from first render ✓
 *   - Capacitor build: Capacitor injects `window.Capacitor` synchronously before
 *                      any JS runs → `true` from first render, zero flicker ✓
 *
 * Detection layers (most reliable → fallback):
 *   1. `window.Capacitor.isNativePlatform()` — official Capacitor 3+ API
 *   2. `window.Capacitor.isPluginAvailable`  — presence check (Capacitor 3+)
 *   3. User-Agent contains "Capacitor"       — injected by Capacitor runtime
 */
function detectNative(): boolean {
  if (typeof window === "undefined") return false;

  const cap = (window as unknown as Record<string, unknown>)["Capacitor"] as
    | { isNativePlatform?: () => boolean; isPluginAvailable?: unknown }
    | undefined;

  if (cap?.isNativePlatform?.()) return true;
  if (cap?.isPluginAvailable !== undefined) return true;

  if (typeof navigator !== "undefined" && navigator.userAgent.includes("Capacitor")) {
    return true;
  }

  return false;
}

// Evaluated once when the module is first imported — before React renders.
const IS_NATIVE: boolean = detectNative();

/**
 * Returns `true` when running inside the native Capacitor/Android APK,
 * `false` on any regular web browser. Value is stable across all renders.
 */
export function useIsNativeApp(): boolean {
  return IS_NATIVE;
}
