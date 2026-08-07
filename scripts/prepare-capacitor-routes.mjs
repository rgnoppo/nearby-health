// Builds `src/routes.capacitor/` — a physical copy of `src/routes/` used ONLY
// by the Android/Capacitor build, with every admin-only route left out.
//
// Why a real separate directory instead of a runtime guard:
// A runtime check (e.g. "if isNative, redirect away from /admin") still ships
// the admin page's JS/HTML inside the APK — anyone can unzip the .apk and read
// it. Excluding the route FILES before the router-tree is even generated
// means the admin screens, their imports, and any strings/markup they contain
// are never bundled into www-android/ in the first place. There is nothing to
// decompile because the code simply isn't there.
//
// This only affects the native app. The website (vite.config.ts / Vercel
// build) still uses src/routes/ untouched, so /admin keeps working from a
// browser exactly as before.
import { existsSync, rmSync, mkdirSync, cpSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const src = resolve(root, "src/routes");
const dest = resolve(root, "src/routes.capacitor");

// Relative paths (POSIX-style, matched against the copy source) to leave out
// of the native build entirely.
const EXCLUDE = new Set([
  "admin.tsx",
  "_authenticated", // whole directory: dashboard.tsx + route.tsx (auth guard)
]);

function copyFiltered(currentSrc, currentDest, relBase = "") {
  mkdirSync(currentDest, { recursive: true });
  for (const entry of readdirSync(currentSrc)) {
    const rel = relBase ? `${relBase}/${entry}` : entry;
    if (EXCLUDE.has(entry) || EXCLUDE.has(rel)) continue;

    const entrySrc = join(currentSrc, entry);
    const entryDest = join(currentDest, entry);
    if (statSync(entrySrc).isDirectory()) {
      copyFiltered(entrySrc, entryDest, rel);
    } else {
      cpSync(entrySrc, entryDest);
    }
  }
}

if (!existsSync(src)) {
  console.error(`[prepare-capacitor-routes] ${src} does not exist.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
copyFiltered(src, dest);

console.log(
  `[prepare-capacitor-routes] Built ${dest} without: ${[...EXCLUDE].join(", ")}`,
);
