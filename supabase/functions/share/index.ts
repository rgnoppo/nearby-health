import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Only these hosts are ever used as the redirect target / base URL. Without
// this allowlist, the `redirect` query param was reflected straight into
// Response.redirect() and into the Open Graph <meta> tags — anyone could
// craft a link like https://<this-domain>/s/clinic/<id>?redirect=https://evil.example
// that looked like it came from this app (same domain, real clinic data)
// but sent visitors to an attacker-controlled site. WhatsApp/Telegram/etc.
// link previews would even render the attacker's page description if it
// were reachable, making the spoofed link look more convincing.
const ALLOWED_REDIRECT_HOSTS = new Set([
  "nearby-health-mu.vercel.app",
  // Add additional production/staging hostnames here as needed.
]);

const DEFAULT_REDIRECT_BASE = "https://nearby-health-mu.vercel.app";

function sanitizeRedirectBase(rawRedirect: string | null): string {
  if (!rawRedirect) return DEFAULT_REDIRECT_BASE;
  try {
    const parsed = new URL(rawRedirect);
    if (parsed.protocol !== "https:") return DEFAULT_REDIRECT_BASE;
    if (!ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)) return DEFAULT_REDIRECT_BASE;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    // Not a valid absolute URL — ignore it rather than reflecting it.
    return DEFAULT_REDIRECT_BASE;
  }
}

const HTML_HEADERS = new Headers({
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
});

function htmlResponse(htmlContent: string, status = 200): Response {
  const encoded = new TextEncoder().encode(htmlContent);
  return new Response(encoded, {
    status,
    headers: HTML_HEADERS,
  });
}

function buildHtml(
  pageTitle: string,
  pageDescription: string,
  targetUrl: string,
  entityName: string,
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return [
    "<!DOCTYPE html>",
    '<html lang="ar" dir="rtl">',
    "<head>",
    '  <meta charset="utf-8">',
    `  <title>${esc(pageTitle)}</title>`,
    `  <meta name="description" content="${esc(pageDescription)}">`,
    "",
    "  <!-- Open Graph -->",
    '  <meta property="og:type" content="website">',
    `  <meta property="og:url" content="${esc(targetUrl)}">`,
    `  <meta property="og:title" content="${esc(pageTitle)}">`,
    `  <meta property="og:description" content="${esc(pageDescription)}">`,
    '  <meta property="og:image" content="https://nearby-health-mu.vercel.app/img.png">',
    '  <meta property="og:image:secure_url" content="https://nearby-health-mu.vercel.app/img.png">',
    '  <meta property="og:image:width" content="1200">',
    '  <meta property="og:image:height" content="630">',
    "",
    "  <!-- Twitter Card -->",
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:url" content="${esc(targetUrl)}">`,
    `  <meta name="twitter:title" content="${esc(pageTitle)}">`,
    `  <meta name="twitter:description" content="${esc(pageDescription)}">`,
    '  <meta name="twitter:image" content="https://nearby-health-mu.vercel.app/img.png">',
    "</head>",
    "<body>",
    '  <p style="font-family:system-ui,sans-serif;padding:2rem">',
    `    \u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0625\u0644\u0649: <a href="${esc(targetUrl)}">${esc(entityName)}</a>\u2026`,
    "  </p>",
    "</body>",
    "</html>",
  ].join("\n");
}

const BOT_REGEX = /(whatsapp|telegrambot|facebookexternalhit|twitterbot|linkedinbot|discordbot|slackbot|curl|fetch|bot|spider|crawler|skypeuripreview|vkshare)/i;

Deno.serve(async (req: Request) => {
  let redirectBase = DEFAULT_REDIRECT_BASE;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type") || "clinic";
    redirectBase = sanitizeRedirectBase(url.searchParams.get("redirect"));
    if (!id || (type !== "clinic" && type !== "category")) {
      return Response.redirect(redirectBase || "/", 302);
    }

    const userAgent = req.headers.get("user-agent") || "";
    const isBot = BOT_REGEX.test(userAgent);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      return Response.redirect(redirectBase || "/", 302);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let targetUrl = "";
    let pageTitle = "";
    let pageDescription = "";
    let entityName = "";

    if (type === "clinic") {
      const { data: clinic, error } = await supabase
        .from("clinics")
        .select("id, name, specialty, address")
        .eq("id", id)
        .maybeSingle();

      if (error || !clinic) return Response.redirect(redirectBase || "/", 302);

      targetUrl = `${redirectBase}/clinic/${encodeURIComponent(id)}`;
      entityName = clinic.name ?? "";
      pageTitle = `${clinic.name} \u2014 \u062f\u0644\u064a\u0644 \u0627\u0644\u0639\u064a\u0627\u062f\u0627\u062a`;
      pageDescription = `\u062a\u062e\u0635\u0635 ${clinic.specialty || "\u0639\u0627\u0645"} \u2013 ${clinic.address}`;
    } else {
      const { data: category, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      if (error || !category) return Response.redirect(redirectBase || "/", 302);

      targetUrl = `${redirectBase}/?category=${encodeURIComponent(id)}`;
      entityName = category.name ?? "";
      pageTitle = `\u0639\u064a\u0627\u062f\u0627\u062a ${category.name} \u2014 \u062f\u0644\u064a\u0644 \u0627\u0644\u0639\u064a\u0627\u062f\u0627\u062a`;
      pageDescription = `\u062a\u0635\u0641\u062d \u0643\u0644 \u0639\u064a\u0627\u062f\u0627\u062a ${category.name}: \u0627\u0644\u0639\u0646\u0627\u0648\u064a\u0646\u060c \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a \u0627\u0644\u0645\u0645\u064a\u0632\u0629 \u0648\u0645\u0648\u0627\u0639\u064a\u062f \u0627\u0644\u0634\u063a\u0644.`;
    }

    if (!isBot) {
      return Response.redirect(targetUrl, 302);
    }

    const html = buildHtml(pageTitle, pageDescription, targetUrl, entityName);
    return htmlResponse(html);

  } catch (err) {
    console.error("Share Function Error:", err);
    return Response.redirect(redirectBase || "/", 302);
  }
});
