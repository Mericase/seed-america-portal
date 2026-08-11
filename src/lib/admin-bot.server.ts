// admin-bot.server.ts — Server-only. Pushes every important site activity to the
// Seedin America admin Telegram bot.

export const ADMIN_ALERT_CHAT_ID = "6048752790";

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

async function postToBot(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_ALERT_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok !== false) return true;
      console.error("[admin-bot] direct send failed", res.status, JSON.stringify(data));
    } catch (e) {
      console.error("[admin-bot] direct send error", e);
    }
  }

  // Fallback: Lovable connector gateway.
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return false;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
      },
      body: JSON.stringify({
        chat_id: ADMIN_ALERT_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[admin-bot] gateway send error", e);
    return false;
  }
}

export type AdminAlert = {
  emoji?: string;
  title: string;
  /** Ordered label/value rows shown under the title. */
  fields?: Array<[string, string | number | null | undefined]>;
  note?: string;
  urgent?: boolean;
};

export async function sendAdminAlert(alert: AdminAlert): Promise<void> {
  try {
    const when = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const rows = (alert.fields ?? [])
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}`)
      .join("\n");

    const text =
      `${alert.urgent ? "🚨🚨 " : ""}${alert.emoji ?? "🔔"} <b>${escapeHtml(alert.title)}</b>\n` +
      (rows ? `\n${rows}\n` : "") +
      (alert.note ? `\n<i>${escapeHtml(alert.note)}</i>\n` : "") +
      `\n<code>${escapeHtml(when)} ET</code>`;

    await postToBot(text);
  } catch (e) {
    console.error("[admin-bot] alert failed", e);
  }
}

/** Loads a member's identity so every alert carries name + email. */
export async function memberIdentity(userId: string): Promise<{
  name: string;
  email: string;
  phone: string;
  tier: number | null;
  balance: number | null;
}> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, phone, tier, balance")
      .eq("id", userId)
      .maybeSingle();
    return {
      name: data?.full_name || "Unknown member",
      email: data?.email || "unknown",
      phone: data?.phone || "",
      tier: data?.tier ?? null,
      balance: data?.balance ?? null,
    };
  } catch {
    return { name: "Unknown member", email: "unknown", phone: "", tier: null, balance: null };
  }
}

export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
