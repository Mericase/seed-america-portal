// Server functions for the "Connect email" feature.
// - Real OAuth for Gmail & Outlook (via Lovable App User Connector).
// - OTP verification for any other email (Yahoo, iCloud, AOL, custom).

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  encryptConnectionKey,
  decryptConnectionKey,
} from "./connection-key-crypto.server";
import { serverEnv } from "./runtime-env.server";
import { sendEmail } from "./email.server";
import { sendAdminAlert, memberIdentity } from "./admin-bot.server";

const GATEWAY = "https://connector-gateway.lovable.dev";

type ProviderId = "gmail" | "outlook";

const PROVIDERS: Record<ProviderId, {
  label: string;
  connectorId: string;
  clientEnv: string;
  scopes: string[];
  profilePath: string;
  emailFromProfile: (p: unknown) => string | null;
}> = {
  gmail: {
    label: "Gmail",
    connectorId: "google_mail",
    clientEnv: "GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    profilePath: "/gmail/v1/users/me/profile",
    emailFromProfile: (p) => (p as { emailAddress?: string })?.emailAddress ?? null,
  },
  outlook: {
    label: "Outlook",
    connectorId: "microsoft_outlook",
    clientEnv: "MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY",
    scopes: ["User.Read", "offline_access"],
    profilePath: "/v1.0/me",
    emailFromProfile: (p) => {
      const r = p as { mail?: string; userPrincipalName?: string };
      return r?.mail || r?.userPrincipalName || null;
    },
  },
};

/* ─────────────────── Read current linked email ─────────────────── */

export const getLinkedEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("linked_emails")
      .select("email, provider, method, verified_at, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

/* ─────────────────── OAuth: Gmail / Outlook ─────────────────── */

export const startProviderConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { provider: ProviderId }) =>
    z.object({ provider: z.enum(["gmail", "outlook"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const cfg = PROVIDERS[data.provider];
    const clientKey = serverEnv(cfg.clientEnv);
    if (!clientKey) {
      return {
        ok: false as const,
        message: `${cfg.label} sign-in isn't fully set up yet. Please try the "Verify by code" option or check back shortly.`,
      };
    }
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from a request context.");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      `/oauth/${data.provider}/return`,
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY,
      connectorId: cfg.connectorId,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      credentialsConfiguration: { scopes: cfg.scopes },
    });
    return { ok: true as const, authorizationUrl };
  });

export const completeProviderConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string; provider: ProviderId }) =>
    z.object({
      code: z.string().min(4),
      provider: z.enum(["gmail", "outlook"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const cfg = PROVIDERS[data.provider];
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY, data.code);
    if (connectorId !== cfg.connectorId) {
      throw new Error("OAuth completion returned the wrong provider.");
    }

    // Look up the user's real email from the provider.
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY,
      connectionAPIKey,
      connectorId,
      path: cfg.profilePath,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Provider profile lookup failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const profile = await res.json().catch(() => ({}));
    const email = cfg.emailFromProfile(profile);
    if (!email) throw new Error("Provider did not return an email address.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("linked_emails").upsert(
      {
        user_id: context.userId,
        email,
        provider: data.provider,
        method: "oauth",
        verified_at: new Date().toISOString(),
        connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    // Telegram alert
    const who = await memberIdentity(context.userId);
    await sendAdminAlert({
      emoji: "🔗",
      title: `${cfg.label} linked`,
      fields: [
        ["Member", who.name],
        ["Seedin email", who.email],
        ["Linked email", email],
        ["Provider", cfg.label],
        ["Method", "OAuth (verified)"],
      ],
    });

    return { ok: true, email, provider: data.provider };
  });

/* ─────────────────── OTP: any other email ─────────────────── */

function hashCode(email: string, code: string): string {
  const secret = serverEnv("APP_USER_CONNECTION_KEY_SECRET") || "seedin-fallback-pepper";
  return createHash("sha256").update(`${secret}:${email.toLowerCase()}:${code}`).digest("hex");
}

export const sendEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string }) =>
    z.object({ email: z.string().email().max(254) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: no more than 5 codes/hour per user.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("email_link_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return { ok: false as const, message: "Too many codes requested. Try again in an hour." };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("email_link_codes").insert({
      user_id: context.userId,
      email,
      code_hash: hashCode(email, code),
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    const html = otpEmailHtml(code);
    const sent = await sendEmail({
      to: email,
      subject: "Your Seedin America email verification code",
      html,
    });
    if (!sent.ok) {
      return { ok: false as const, message: "We couldn't send the code right now. Please try again." };
    }
    return { ok: true as const };
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; code: string }) =>
    z.object({
      email: z.string().email().max(254),
      code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("email_link_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", context.userId)
      .eq("email", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, message: "No active code. Please request a new one." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, message: "Code expired. Please request a new one." };
    }
    if ((row.attempts ?? 0) >= 5) {
      return { ok: false as const, message: "Too many wrong attempts. Request a new code." };
    }

    const expected = Buffer.from(row.code_hash, "hex");
    const provided = Buffer.from(hashCode(email, data.code), "hex");
    const match = expected.length === provided.length && timingSafeEqual(expected, provided);

    if (!match) {
      await supabaseAdmin
        .from("email_link_codes")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false as const, message: "That code doesn't match. Try again." };
    }

    await supabaseAdmin
      .from("email_link_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const provider = providerFromEmail(email);
    await supabaseAdmin.from("linked_emails").upsert(
      {
        user_id: context.userId,
        email,
        provider,
        method: "otp",
        verified_at: new Date().toISOString(),
        connection_key_ciphertext: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const who = await memberIdentity(context.userId);
    await sendAdminAlert({
      emoji: "✉️",
      title: "Email verified by code",
      fields: [
        ["Member", who.name],
        ["Seedin email", who.email],
        ["Linked email", email],
        ["Provider", provider],
        ["Method", "OTP (code)"],
      ],
    });

    return { ok: true as const, email, provider };
  });

/* ─────────────────── Disconnect ─────────────────── */

export const disconnectLinkedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("linked_emails")
      .select("email, provider, method, connection_key_ciphertext")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row) return { ok: true };

    if (row.connection_key_ciphertext && (row.provider === "gmail" || row.provider === "outlook")) {
      try {
        const key = decryptConnectionKey(row.connection_key_ciphertext);
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY,
          connectionAPIKey: key,
          connectorId: PROVIDERS[row.provider as ProviderId].connectorId,
        });
      } catch (e) {
        console.error("[connect-email] gateway disconnect failed", e);
      }
    }

    await supabaseAdmin.from("linked_emails").delete().eq("user_id", context.userId);

    const who = await memberIdentity(context.userId);
    await sendAdminAlert({
      emoji: "🔌",
      title: "Email disconnected",
      fields: [
        ["Member", who.name],
        ["Seedin email", who.email],
        ["Was", row.email],
        ["Provider", row.provider],
      ],
    });
    return { ok: true };
  });

/* ─────────────────── Helpers ─────────────────── */

function providerFromEmail(email: string): string {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (/(^|\.)yahoo\./.test(d) || d === "ymail.com" || d === "rocketmail.com") return "yahoo";
  if (d === "icloud.com" || d === "me.com" || d === "mac.com") return "icloud";
  if (d === "aol.com") return "aol";
  if (d === "gmail.com" || d === "googlemail.com") return "gmail";
  if (d === "outlook.com" || d === "hotmail.com" || d === "live.com" || d === "msn.com") return "outlook";
  return "other";
}

function otpEmailHtml(code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#101828">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(9,20,40,.06)">
        <tr><td style="background:#0b2545;padding:28px 32px">
          <p style="margin:0;color:#f5c95c;font-weight:700;letter-spacing:.14em;font-size:12px;text-transform:uppercase">Seedin America</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700">Verify your email</p>
        </td></tr>
        <tr><td style="padding:28px 32px 8px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55">Use the code below to finish linking this email to your Seedin America account. It expires in <b>10 minutes</b>.</p>
          <div style="margin:20px 0;padding:20px;border:1px dashed #d0d5dd;border-radius:12px;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.5em;font-size:34px;font-weight:700;color:#0b2545">${code}</div>
          <p style="margin:0;font-size:13px;color:#475467">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;color:#98a2b3;font-size:12px;border-top:1px solid #eef0f3">
          Seedin America · Federal Grant Initiative · This message was sent to verify email ownership only.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
