// email.server.ts — Server-only. Do NOT import from client code.

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";

export const FROM_ADDRESS = "Seedin America <info@seedinamerica.org>";

const HERO_URL = "https://seedinamerica.org/email-assets/hero-seedling.jpeg";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
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
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
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
}): string {
  const {
    preheader = "",
    heading,
    intro = "",
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote = "Seedin America · Empowering communities through capital access.",
  } = opts;

  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td align="center" style="padding:8px 0 24px 0;">
           <a href="${ctaUrl}" style="background:linear-gradient(135deg,#1a3a26 0%,#2d6a4f 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;display:inline-block;letter-spacing:0.2px;box-shadow:0 4px 20px rgba(29,77,49,0.35);">${ctaLabel} &rarr;</a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#0f2a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f2a1a;">
    <tr><td align="center" style="padding:40px 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;border-radius:20px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.5);">

        <!-- HERO -->
        <tr><td style="padding:0;margin:0;">
          <div style="background-image:url('${HERO_URL}');background-size:cover;background-position:center top;min-height:300px;">
            <div style="background:linear-gradient(to bottom,rgba(15,42,26,0.35) 0%,rgba(15,42,26,0.85) 100%);min-height:300px;padding:36px 36px 32px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
              <div style="margin-bottom:16px;text-align:center;">
                <span style="font-size:12px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#c9a84c;display:block;margin-bottom:6px;">⚜ Seedin America</span>
                <span style="display:inline-block;width:40px;height:2px;background:linear-gradient(to right,#c9a84c,#f0d080);border-radius:2px;"></span>
              </div>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;text-align:center;line-height:1.25;letter-spacing:-0.02em;text-shadow:0 2px 12px rgba(0,0,0,0.4);">${heading}</h1>
              ${intro ? `<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.82);text-align:center;line-height:1.5;">${intro}</p>` : ""}
            </div>
          </div>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:36px 40px 16px;">
          <div style="font-size:15px;line-height:1.65;color:#333333;">${bodyHtml}</div>
        </td></tr>

        <!-- CTA -->
        ${cta}

        <!-- REFERRAL BANNER -->
        <tr><td style="background:linear-gradient(135deg,#1a3a26 0%,#0f2a1a 100%);padding:20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="middle" style="padding-right:12px;font-size:24px;">✨</td>
              <td valign="middle">
                <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:0.15em;text-transform:uppercase;">Referral Bonus</p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.5;">
                  Refer a friend and earn <strong style="color:#f0d080;">$300</strong>.
                  Every referred applicant receives an instant <strong style="color:#f0d080;">$200</strong> bonus balance on signup.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">${footerNote}</p>
          <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">
            If you did not create this account, <a href="mailto:support@seedinamerica.org" style="color:#2d6a4f;text-decoration:none;">contact support</a>.
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
