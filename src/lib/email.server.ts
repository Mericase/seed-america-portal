// email.server.ts — Server-only. Do NOT import from client code.

import { serverEnv } from "./runtime-env.server";
const RESEND_URL = "https://api.resend.com/emails";
const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";

export const FROM_ADDRESS = "Seedin America <info@seedinamerica.org>";

const HERO_URL = "https://seedinamerica.org/email-assets/hero-seedling.jpeg";

// ── global rate limiter ───────────────────────────────────────────────────
// Resend allows ~2 requests/second. Sending a large batch in parallel makes
// everything past the first handful fail with 429, which is why only a dozen
// emails were landing. Every send is funnelled through this serial gate.
const MIN_SEND_INTERVAL_MS = 550;
let sendChain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function rateLimitSlot(): Promise<void> {
  const slot = sendChain.then(() => sleep(MIN_SEND_INTERVAL_MS));
  sendChain = slot.catch(() => undefined);
  return slot;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {

  const RESEND_API_KEY = serverEnv("RESEND_API_KEY");
  const LOVABLE_API_KEY = serverEnv("LOVABLE_API_KEY");
  const from = serverEnv("RESEND_FROM") || FROM_ADDRESS;

  if (!RESEND_API_KEY) {
    console.error("[email] missing RESEND_API_KEY");
    return { ok: false, error: "email_not_configured" };
  }

  const body = JSON.stringify({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? htmlToText(opts.html),
    reply_to: opts.replyTo ?? "info@seedinamerica.org",
    headers: {
      "X-Entity-Ref-ID": `seedin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });

  const useGateway = Boolean(LOVABLE_API_KEY);
  const url = useGateway ? RESEND_GATEWAY_URL : RESEND_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${useGateway ? LOVABLE_API_KEY : RESEND_API_KEY}`,
  };

  if (useGateway) {
    headers["X-Connection-Api-Key"] = RESEND_API_KEY;
  }

  let lastError = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    await rateLimitSlot();
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      const txt = await res.text().catch(() => "");

      if (res.ok) return { ok: true };

      let message = txt || `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(txt);
        message = parsed?.message || parsed?.error || message;
      } catch {
        // keep plain-text response
      }
      lastError = `resend_${res.status}: ${message}`;

      // Rate limited or transient upstream error → back off and retry.
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1));
        continue;
      }

      console.error("[email] send failed", res.status, txt);
      return { ok: false, error: lastError };
    } catch (e) {
      console.error("[email] send error", e);
      lastError = "network";
      await sleep(900 * (attempt + 1));
    }
  }
  console.error("[email] send exhausted retries", lastError);
  return { ok: false, error: lastError };
}


export function renderBrandedEmail(opts: {
  preheader?: string;
  heading: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  categoryLabel?: string;
  showReferralBanner?: boolean;
}): string {
  const {
    preheader = "",
    heading,
    intro = "",
    bodyHtml,
    ctaLabel,
    ctaUrl,
    categoryLabel = "Official Member Notice",
    showReferralBanner = false,
    footerNote = "Seedin America · Empowering communities through capital access.",
  } = opts;

  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td align="center" style="background:#ffffff;padding:10px 42px 34px;">
           <a href="${escapeAttr(ctaUrl)}" style="background:#102b1b;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:15px 34px;border-radius:6px;display:inline-block;letter-spacing:0.04em;text-transform:uppercase;border:1px solid #c9a84c;box-shadow:0 10px 24px rgba(16,43,27,0.20);">${escapeHtml(ctaLabel)} &rarr;</a>
         </td></tr>`
      : "";

  const referral = showReferralBanner
    ? `<tr><td style="background:#102b1b;padding:20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="middle" style="padding-right:12px;font-size:24px;">✨</td>
              <td valign="middle">
                <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:0.15em;text-transform:uppercase;">Referral Bonus</p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.82);line-height:1.5;">
                  Refer a friend and earn <strong style="color:#f0d080;">$300</strong>.
                  Every referred applicant receives an instant <strong style="color:#f0d080;">$200</strong> bonus balance on signup.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#eef3ef;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ef;">
    <tr><td align="center" style="padding:34px 14px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:640px;border-radius:0;overflow:hidden;border:1px solid #d7dfd9;box-shadow:0 18px 50px rgba(16,43,27,0.14);">

        <!-- BRAND HEADER -->
        <tr><td style="background:#102b1b;padding:28px 38px 26px;text-align:center;border-bottom:4px solid #c9a84c;">
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
            <tr>
              <td style="width:54px;height:54px;border-radius:999px;background:#1f5f3b;border:2px solid #c9a84c;text-align:center;vertical-align:middle;font-size:25px;box-shadow:0 10px 28px rgba(0,0,0,0.24);">🌱</td>
              <td style="padding-left:12px;text-align:left;vertical-align:middle;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:#ffffff;line-height:1;">Seedin <span style="color:#c9a84c;">America</span></div>
                <div style="margin-top:6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.70);">Plant · Grow · Prosper</div>
              </td>
            </tr>
          </table>
          <div style="display:inline-block;margin:4px 0 20px;padding:7px 14px;border:1px solid rgba(201,168,76,0.55);border-radius:3px;background:rgba(255,255,255,0.06);font-size:10px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#ffffff;">Endorsed by the Office of the President</div>
          <p style="margin:0 0 9px;font-size:11px;font-weight:900;color:#c9a84c;letter-spacing:0.20em;text-transform:uppercase;">${escapeHtml(categoryLabel)}</p>
          <h1 style="margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:700;color:#ffffff;text-align:center;line-height:1.18;max-width:520px;">${escapeHtml(heading)}</h1>
          ${intro ? `<p style="margin:12px auto 0;max-width:500px;font-size:14px;color:rgba(255,255,255,0.84);text-align:center;line-height:1.62;">${intro}</p>` : ""}
        </td></tr>

        <tr><td style="background:#ffffff;padding:0 42px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #dce4df;">
            <tr>
              <td style="padding:18px 0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#5f6b64;">Official correspondence</td>
              <td align="right" style="padding:18px 0;font-size:11px;color:#7a857e;">Member Services</td>
            </tr>
          </table>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:34px 42px 18px;">
          <div style="font-size:15px;line-height:1.72;color:#27322c;">${bodyHtml}</div>
        </td></tr>

        <!-- CTA -->
        ${cta}

        ${referral}

        <!-- FOOTER -->
        <tr><td style="background:#f6f8f6;padding:24px 42px;border-top:1px solid #dce4df;">
          <p style="margin:0 0 8px;font-size:12px;color:#69756e;text-align:center;line-height:1.6;">${footerNote}</p>
          <p style="margin:0;font-size:11px;color:#8b958f;text-align:center;line-height:1.55;">
            This email was sent by Seedin America Member Services. For account support, contact <a href="mailto:info@seedinamerica.org" style="color:#1d4f33;text-decoration:none;font-weight:700;">info@seedinamerica.org</a>.
          </p>
          <p style="margin:12px 0 0;font-size:10px;color:#a6aea9;text-align:center;letter-spacing:0.12em;text-transform:uppercase;">
            &copy; ${new Date().getFullYear()} Seedin America &middot; info@seedinamerica.org
          </p>
        </td></tr>

      </table>
      <p style="margin:18px 0 38px;font-size:11px;color:#7f8b84;text-align:center;">Seedin America Federal Grant Initiative</p>
    </td></tr>
  </table>
</body></html>`;
}

export function emailParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="white-space:pre-wrap;margin:0 0 16px;">${escapeHtml(block)}</p>`)
    .join("");
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
