import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { createOtpToken, genCode, renderOtpEmail, sha256Hex } = await import("./signup-otp.server");
    const { sendEmail } = await import("./email.server");

    let canPersistOtp = false;
    let supabaseAdmin: Awaited<ReturnType<typeof import("./supabase-admin.server")["getSupabaseAdmin"]>> | undefined;
    const code = genCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const otpToken = await createOtpToken({
      email: data.email,
      codeHash,
      expiresAt,
      nonce: crypto.randomUUID(),
    });

    try {
      const { getSupabaseAdmin } = await import("./supabase-admin.server");
      supabaseAdmin = getSupabaseAdmin();

      // Rate limit: 45s between sends for same email when privileged backend access is available.
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

      // Invalidate previous unverified codes for this email.
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
      canPersistOtp = true;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Please wait")) throw e;
      console.warn("[signup-otp] persistent OTP storage unavailable; using signed verification token fallback", e);
    }

    const res = await sendEmail({
      to: data.email,
      subject: `Your Seedin America verification code: ${code}`,
      html: renderOtpEmail(code, data.email),
      text: `Your Seedin America verification code is ${code}. This code expires in 10 minutes.`,
    });
    if (!res.ok) throw new Error("Could not send verification email. Please try again.");

    return { ok: true, otpToken, persisted: canPersistOtp };
  });

export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string; code: string; otpToken?: string }) =>
    z.object({
      email: z.string().trim().toLowerCase().email().max(255),
      code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
      otpToken: z.string().max(3000).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { readOtpToken, sha256Hex } = await import("./signup-otp.server");
    const hash = await sha256Hex(data.code);

    try {
      const { getSupabaseAdmin } = await import("./supabase-admin.server");
      const supabaseAdmin = getSupabaseAdmin();
      const { data: row } = await supabaseAdmin
        .from("email_otps")
        .select("id, code_hash, expires_at, attempts, verified_at")
        .eq("email", data.email)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row) {
        if (new Date(row.expires_at).getTime() < Date.now())
          throw new Error("This code has expired. Please request a new one.");
        if (row.attempts >= 5)
          throw new Error("Too many attempts. Please request a new code.");

        if (hash !== row.code_hash) {
          await supabaseAdmin.from("email_otps")
            .update({ attempts: row.attempts + 1 }).eq("id", row.id);
          throw new Error("Incorrect code. Please try again.");
        }

        await supabaseAdmin.from("email_otps")
          .update({ verified_at: new Date().toISOString() }).eq("id", row.id);

        return { ok: true };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("expired") || message.includes("attempts") || message.includes("Incorrect")) throw e;
      console.warn("[signup-otp] persistent OTP verification unavailable; checking signed token fallback", e);
    }

    if (!data.otpToken) throw new Error("No active verification code. Please request a new one.");
    const payload = await readOtpToken(data.otpToken, data.email);
    if (hash !== payload.codeHash) throw new Error("Incorrect code. Please try again.");

    return { ok: true };
  });
