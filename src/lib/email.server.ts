// Resend email helper (via connector gateway). Server-only.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const FROM_ADDRESS = "Seedin America <info@seedinamerica.org>";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error("[email] missing LOVABLE_API_KEY or RESEND_API_KEY");
    return { ok: false, error: "email_not_configured" };
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[email] send failed", res.status, txt);
      return { ok: false, error: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send error", e);
    return { ok: false, error: "network" };
  }
}

// Branded email shell — consistent, premium look across all transactional sends.
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
           <a href="${ctaUrl}" style="background:#0f6b3e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px;display:inline-block;letter-spacing:0.2px;">${ctaLabel}</a>
         </td></tr>`
      : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,107,62,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0f6b3e 0%,#0a4f2d 100%);padding:32px 32px 28px 32px;text-align:left;">
          <div style="color:#d4af37;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Seedin America</div>
          <h1 style="margin:10px 0 0 0;color:#ffffff;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.3px;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 8px 32px;">
          ${intro ? `<p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#3a3a3a;">${intro}</p>` : ""}
          <div style="font-size:15px;line-height:1.65;color:#333333;">${bodyHtml}</div>
        </td></tr>
        ${cta}
        <tr><td style="padding:8px 32px 28px 32px;">
          <hr style="border:none;border-top:1px solid #eeeae1;margin:0 0 18px 0;">
          <p style="margin:0;font-size:12px;line-height:1.55;color:#8a8a8a;">${footerNote}</p>
          <p style="margin:8px 0 0 0;font-size:12px;color:#a8a8a8;">© ${new Date().getFullYear()} Seedin America. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
