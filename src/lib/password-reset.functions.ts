import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Buffer } from "node:buffer";

/**
 * Custom password-reset flow that sends the reset link via Resend
 * so it works on any domain (Cloudflare, Lovable preview, etc.)
 * instead of relying on Supabase's redirect URL allowlist.
 */

// ── helpers ──────────────────────────────────────────────────────────────

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── send reset email ─────────────────────────────────────────────────────

export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string; origin: string }) =>
    z
      .object({
        email: z.string().email().max(320),
        origin: z.string().url().max(500),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { serverEnv } = await import("./runtime-env.server");
    const { sendEmail, renderBrandedEmail, escapeHtml } = await import("./email.server");

    const secret = serverEnv(
      "SIGNUP_OTP_SECRET",
      "RESEND_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    );
    if (!secret) {
      // Don't reveal config issues to the user
      console.error("[reset] no signing secret available");
      return { ok: true as const }; // always say OK so emails can't be enumerated
    }

    const email = data.email.trim().toLowerCase();

    // Create a signed token: { email, exp } — valid 60 minutes
    const payload = { email, exp: Date.now() + 60 * 60 * 1000 };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = await hmacSign(encoded, secret);
    const token = `${encoded}.${signature}`;

    const resetUrl = `${data.origin}/reset-password?token=${encodeURIComponent(token)}`;

    const html = renderBrandedEmail({
      preheader: "Your Seedin America password reset link expires in 60 minutes.",
      heading: "Reset your password",
      intro: "We received a request to reset your Seedin America account password.",
      categoryLabel: "Account Security",
      bodyHtml: `
        <p style="margin:0 0 22px;color:#5f6b64;font-size:14px;line-height:1.7;">
          Click the button below to choose a new password. This link expires in <strong style="color:#102b1b;">60 minutes</strong>.
        </p>
      `,
      ctaLabel: "Reset Password",
      ctaUrl: resetUrl,
      footerNote: "If you didn't request this, you can safely ignore this email. Your password will remain unchanged.",
    });

    const result = await sendEmail({
      to: email,
      subject: "Reset your Seedin America password",
      html,
    });

    if (!result.ok) {
      console.error("[reset] email send failed:", result.error);
    }

    // Always return ok: true to prevent email enumeration
    return { ok: true as const };
  });

// ── verify token & reset password ────────────────────────────────────────

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((i: { token: string; newPassword: string }) =>
    z
      .object({
        token: z.string().min(1).max(2000),
        newPassword: z.string().min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { serverEnv } = await import("./runtime-env.server");

    const secret = serverEnv(
      "SIGNUP_OTP_SECRET",
      "RESEND_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    );
    if (!secret) {
      return { ok: false as const, message: "Password reset is temporarily unavailable." };
    }

    // Verify token signature
    const [encoded, signature] = data.token.split(".");
    if (!encoded || !signature) {
      return { ok: false as const, message: "This reset link is invalid or has expired. Please request a new one." };
    }

    const expected = await hmacSign(encoded, secret);
    if (!timingSafeEqualHex(signature, expected)) {
      return { ok: false as const, message: "This reset link is invalid or has expired. Please request a new one." };
    }

    let payload: { email: string; exp: number };
    try {
      payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    } catch {
      return { ok: false as const, message: "This reset link is invalid or has expired. Please request a new one." };
    }

    if (!payload.email || !payload.exp || payload.exp < Date.now()) {
      return { ok: false as const, message: "This reset link has expired. Please request a new one." };
    }

    // Use admin to find the user and update their password
    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    let admin: ReturnType<typeof getSupabaseAdmin>;
    try {
      admin = getSupabaseAdmin();
    } catch {
      return { ok: false as const, message: "Password reset is temporarily unavailable. Please try again later." };
    }

    // Look up user by email
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1 });
    // listUsers doesn't filter by email; use a different approach
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", payload.email)
      .maybeSingle();

    if (!profile) {
      // Don't reveal whether user exists
      return { ok: true as const };
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(profile.id, {
      password: data.newPassword,
    });

    if (updateErr) {
      console.error("[reset] password update failed:", updateErr.message);
      return { ok: false as const, message: "Could not update your password. Please try again." };
    }

    return { ok: true as const };
  });
