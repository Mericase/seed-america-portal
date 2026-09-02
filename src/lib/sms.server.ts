// sms.server.ts — Server-only. Do NOT import from client code.
// Sends SMS via Twilio through the Lovable connector gateway.

import { serverEnv } from "./runtime-env.server";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = serverEnv("LOVABLE_API_KEY");
  const TWILIO_API_KEY = serverEnv("TWILIO_API_KEY");
  const from = serverEnv("TWILIO_FROM", "TWILIO_PHONE_NUMBER");

  if (!TWILIO_API_KEY || !LOVABLE_API_KEY) {
    return { ok: false, error: "sms_not_configured" };
  }
  if (!from) {
    return { ok: false, error: "sms_from_not_configured" };
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: opts.to,
        From: from,
        Body: opts.body.slice(0, 1500),
      }),
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      let message = txt || `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(txt);
        message = parsed?.message || parsed?.error_message || message;
      } catch {}
      console.error("[sms] send failed", res.status, txt);
      return { ok: false, error: `twilio_${res.status}: ${message}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[sms] send error", e);
    return { ok: false, error: "network" };
  }
}

// Normalizes to E.164 (adds "+" if missing). Returns null if clearly invalid.
export function normalizePhone(raw: string, defaultCountry = "1"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  // If US-style 10 digits, prefix default country
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  return `+${digits}`;
}

export function extractPhones(input: string): string[] {
  const parts = input.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizePhone(p);
    if (n) seen.add(n);
  }
  return Array.from(seen);
}
