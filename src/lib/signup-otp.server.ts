import { Buffer } from "node:buffer";

import { escapeHtml, renderBrandedEmail } from "./email.server";
import { serverEnv } from "./runtime-env.server";

type OtpPayload = {
  email: string;
  codeHash: string;
  expiresAt: string;
  nonce: string;
};

export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function genCode(): string {
  const max = 4_294_000_000;
  const bytes = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0] ?? 0;
  } while (value >= max);
  const n = value % 1_000_000;
  return n.toString().padStart(6, "0");
}

function getSigningSecret(): string {
  const secret =
    serverEnv("SIGNUP_OTP_SECRET", "RESEND_API_KEY", "LOVABLE_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
  if (!secret) {
    throw new Error("Email verification is not configured. Please contact support.");
  }
  return secret;
}

async function hmacHex(message: string, secret: string): Promise<string> {
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

export async function createOtpToken(payload: OtpPayload): Promise<string> {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = await hmacHex(encoded, getSigningSecret());
  return `${encoded}.${signature}`;
}

export async function readOtpToken(token: string, email: string): Promise<OtpPayload> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("Verification session expired. Please request a new code.");

  const expected = await hmacHex(encoded, getSigningSecret());
  if (!timingSafeEqualHex(signature, expected)) {
    throw new Error("Verification session expired. Please request a new code.");
  }

  let payload: OtpPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OtpPayload;
  } catch {
    throw new Error("Verification session expired. Please request a new code.");
  }

  if (payload.email !== email) throw new Error("This code was sent to a different email address.");
  if (new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error("This code has expired. Please request a new one.");
  }
  return payload;
}

export function renderOtpEmail(code: string, email: string): string {
  return renderBrandedEmail({
    preheader: "Your secure Seedin America email verification code expires in 10 minutes.",
    heading: "Secure email verification",
    intro: "Use the one-time code below to continue your member registration.",
    categoryLabel: "Identity Verification",
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #d9e2dc;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#f6faf7;padding:16px 18px;border-bottom:1px solid #d9e2dc;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#1d4f33;">Member verification code</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#ffffff;padding:26px 20px 24px;">
            <div style="display:inline-block;border:1px solid #c9a84c;background:#fffdf5;padding:18px 26px;border-radius:10px;">
              <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:800;color:#102b1b;letter-spacing:0.38em;padding-left:0.38em;">${code}</div>
            </div>
            <p style="margin:18px 0 0;font-size:13px;line-height:1.65;color:#5f6b64;">This code expires in <strong style="color:#102b1b;">10 minutes</strong> and can only be used for ${escapeHtml(email)}.</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#5f6b64;font-size:14px;line-height:1.7;">For your protection, Seedin America will never ask for your password by email. If you did not request this code, you may safely ignore this notice.</p>
    `,
    footerNote: "Seedin America Member Services · Secure registration notice.",
  });
}