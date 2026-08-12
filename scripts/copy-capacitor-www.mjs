// Copies the Capacitor SPA build output (dist/client, produced by
// `vite build --config vite.config.capacitor.ts`) into www-android/, which is
// what capacitor.config.ts points to as `webDir`.
//
// Kept as a plain Node script (not shell `cp -r`) so it runs the same on
// macOS/Linux/Windows without extra dependencies.
import { existsSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
// The `nitro()` plugin in vite.config.capacitor.ts has no explicit `preset`,
// so it falls back to Nitro's default "node-server" preset, which writes to
// `.output/public` (client) and `.output/server` (server) — NOT `dist/client`.
// (`dist/client` is what the WEB build produces, because vite.config.ts sets
// `preset: "vercel"`, which uses a different output layout.)
const src = resolve(root, ".output/public");
const dest = resolve(root, "www-android");

if (!existsSync(src)) {
  console.error(
    `[copy-capacitor-www] ${src} does not exist. Did "vite build --config vite.config.capacitor.ts" run first?`,
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

// Prevent recursive APK bloat: remove the downloads folder from the Android asset build
const downloadsDir = resolve(dest, "downloads");
if (existsSync(downloadsDir)) {
  rmSync(downloadsDir, { recursive: true, force: true });
  console.log(`[copy-capacitor-www] Removed ${downloadsDir} to save APK size.`);
}

console.log(`[copy-capacitor-www] Copied ${src} -> ${dest}`);
