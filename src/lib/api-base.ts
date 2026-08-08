import { Capacitor } from "@capacitor/core";

// Inside the Android/iOS app the WebView's origin is capacitor://localhost
// (or https://localhost) — never the real deployed site — so requests to
// server routes (e.g. /api/suggest) must target the full public origin
// instead of a relative path. On the web build the app is already
// same-origin with its own API, so "" (a relative fetch) is used and no
// cross-origin request — and therefore no CORS — is involved at all.
//
// Same pattern already used for share links, see ShareButton.tsx.
const PUBLIC_SITE_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "");

export function getApiOrigin(): string {
  if (Capacitor.isNativePlatform() && PUBLIC_SITE_ORIGIN) {
    return PUBLIC_SITE_ORIGIN;
  }
  return "";
}
