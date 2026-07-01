import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

function renderOtpEmail(code: string, email: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#0f2a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f2a1a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.5);">
        <tr><td style="background:linear-gradient(135deg,#0f2a1a,#1a3a26);padding:40px 40px 28px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#c9a84c;">⚜ Seedin America</p>
          <span style="display:inline-block;width:40px;height:2px;background:linear-gradient(to right,#c9a84c,#f0d080);border-radius:2px;margin-bottom:14px;"></span>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.01em;">Verify your email address</h1>
          <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">Enter the code below to continue your registration.</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px 40px 12px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#555;">Your one-time verification code:</p>
          <div style="display:inline-block;padding:20px 32px;background:linear-gradient(135deg,#f0f7f0 0%,#e6f0e6 100%);border:1px solid rgba(45,106,79,0.2);border-radius:14px;margin:8px 0 20px;">
            <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:38px;font-weight:700;color:#1a3a26;letter-spacing:0.5em;padding-left:0.5em;">${code}</div>
          </div>
          <p style="margin:0 0 6px;font-size:13px;color:#666;line-height:1.6;">
            This code expires in <strong>10 minutes</strong> and can only be used once.
          </p>
          <p style="margin:0 0 24px;font-size:12px;color:#999;line-height:1.6;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">Sent to ${email}</p>
          <p style="margin:0;font-size:11px;color:#d1d5db;letter-spacing:0.1em;text-transform:uppercase;">
            &copy; ${new Date().getFullYear()} Seedin America
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const sendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail } = await import("./email.server");

    // Rate limit: 45s between sends for same email
    const { data: recent } = await supabaseAdmin
      .from("email_otps")
      .select("last_sent_at")
      .eq("email", data.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.last_sent_at) {
      const ageMs = Date.now() - new Date(recent.last_sent_at).getTime();
      if (ageMs < 45_000) {
        const wait = Math.ceil((45_000 - ageMs) / 1000);
        throw new Error(`Please wait ${wait}s before requesting another code.`);
      }
    }

    const code = genCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    // Invalidate previous unverified codes for this email
    await supabaseAdmin
      .from("email_otps")
      .update({ expires_at: new Date(0).toISOString() })
      .eq("email", data.email)
      .is("verified_at", null);

    const { error: insErr } = await supabaseAdmin.from("email_otps").insert({
      email: data.email,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    });
    if (insErr) throw new Error(insErr.message);

    const res = await sendEmail({
      to: data.email,
      subject: `Your Seedin America verification code: ${code}`,
      html: renderOtpEmail(code, data.email),
    });
    if (!res.ok) throw new Error("Could not send verification email. Please try again.");

    return { ok: true };
  });

export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string; code: string }) =>
    z.object({
      email: z.string().trim().toLowerCase().email().max(255),
      code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("email_otps")
      .select("id, code_hash, expires_at, attempts, verified_at")
      .eq("email", data.email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("No active verification code. Please request a new one.");
    if (new Date(row.expires_at).getTime() < Date.now())
      throw new Error("This code has expired. Please request a new one.");
    if (row.attempts >= 5)
      throw new Error("Too many attempts. Please request a new code.");

    const hash = await sha256Hex(data.code);
    if (hash !== row.code_hash) {
      await supabaseAdmin.from("email_otps")
        .update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Incorrect code. Please try again.");
    }

    await supabaseAdmin.from("email_otps")
      .update({ verified_at: new Date().toISOString() }).eq("id", row.id);

    return { ok: true };
  });
