// parked-domain.ts — Keeps the old domain (seedinamerica.org) "parked".
//
// Visitors to the old domain see only a "Redirecting…" spinner that never
// finishes. The real site is only served on seedin.site.
//
// This only affects web pages. Email (Resend) uses DNS records, which this
// code never touches, so sending from info@seedinamerica.org keeps working.

// Hostnames that should show the spinner page instead of the site.
const PARKED_HOSTS = new Set(["seedinamerica.org", "www.seedinamerica.org"]);

// Paths that must keep working on the old domain (webhooks, health check,
// images used inside emails, the push service worker).
const ALLOWED_PREFIXES = ["/api/", "/email-assets/"];
const ALLOWED_EXACT = new Set(["/sw.js", "/favicon.ico", "/robots.txt"]);

export function isParkedRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (!PARKED_HOSTS.has(url.hostname.toLowerCase())) return false;
  if (ALLOWED_EXACT.has(url.pathname)) return false;
  if (ALLOWED_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  return true;
}

const PARKED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Redirecting…</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #f7f7f5; color: #1a1a1a; text-align: center; padding: 24px;
    }
    .spinner {
      width: 48px; height: 48px; border-radius: 50%;
      border: 4px solid #dfe6e1; border-top-color: #1d4f33;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 1.15rem; font-weight: 600; }
    @media (prefers-color-scheme: dark) {
      body { background: #111312; color: #f1f1f1; }
      .spinner { border-color: #2a302c; border-top-color: #6fbf8e; }
    }
  </style>
</head>
<body>
  <div class="spinner" role="status" aria-label="Loading"></div>
  <h1>Redirecting…</h1>
</body>
</html>`;

export function parkedResponse(): Response {
  return new Response(PARKED_HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
