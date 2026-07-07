// email.server.ts — Server-only. Do NOT import from client code.

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";

export const FROM_ADDRESS = "Seedin America <info@seedinamerica.org>";

const HERO_URL = "https://seedinamerica.org/email-assets/hero-seedling.jpeg";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const from = process.env.RESEND_FROM || FROM_ADDRESS;

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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[email] send failed", res.status, txt);
      let message = txt || `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(txt);
        message = parsed?.message || parsed?.error || message;
      } catch {
        // keep plain-text response
      }
      return { ok: false, error: `resend_${res.status}: ${message}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send error", e);
    return { ok: false, error: "network" };
  }
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
      ? `<tr><td align="center" style="padding:8px 0 24px 0;">
           <a href="${escapeAttr(ctaUrl)}" style="background:#1a3a26;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;display:inline-block;letter-spacing:0.2px;box-shadow:0 4px 20px rgba(29,77,49,0.22);">${escapeHtml(ctaLabel)} &rarr;</a>
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
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#0f2a1a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f2a1a;">
    <tr><td align="center" style="padding:40px 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:600px;border-radius:20px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.42);">

        <!-- BRAND HEADER -->
        <tr><td style="background:#102b1b;padding:34px 36px 30px;text-align:center;">
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
            <tr>
              <td style="width:52px;height:52px;border-radius:999px;background:#1f5f3b;border:2px solid #c9a84c;text-align:center;vertical-align:middle;font-size:25px;box-shadow:0 10px 28px rgba(0,0,0,0.24);">🌱</td>
              <td style="padding-left:12px;text-align:left;vertical-align:middle;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:#ffffff;line-height:1;">Seedin <span style="color:#c9a84c;">America</span></div>
                <div style="margin-top:6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.70);">Plant · Grow · Prosper</div>
              </td>
            </tr>
          </table>
          <div style="display:inline-block;margin:4px 0 18px;padding:7px 12px;border:1px solid rgba(255,255,255,0.18);border-radius:999px;background:rgba(255,255,255,0.08);font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ffffff;">Endorsed by the Office of the President</div>
          <div style="margin:0 auto 18px;width:48px;height:2px;background:#c9a84c;border-radius:2px;"></div>
          <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#c9a84c;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(categoryLabel)}</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#ffffff;text-align:center;line-height:1.2;">${escapeHtml(heading)}</h1>
          ${intro ? `<p style="margin:10px auto 0;max-width:460px;font-size:14px;color:rgba(255,255,255,0.82);text-align:center;line-height:1.55;">${intro}</p>` : ""}
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:36px 40px 16px;">
          <div style="font-size:15px;line-height:1.65;color:#333333;">${bodyHtml}</div>
        </td></tr>

        <!-- CTA -->
        ${cta}

        ${referral}

        <!-- FOOTER -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">${footerNote}</p>
          <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">
            If you did not create this account, <a href="mailto:info@seedinamerica.org" style="color:#2d6a4f;text-decoration:none;">contact support</a>.
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">
            &copy; ${new Date().getFullYear()} Seedin America &middot; info@seedinamerica.org
          </p>
        </td></tr>

      </table>
      <p style="margin:20px 0 40px;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;">Seedin America Federal Grant Initiative</p>
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
