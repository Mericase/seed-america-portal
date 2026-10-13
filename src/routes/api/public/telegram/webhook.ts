import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const BOT_TOKEN = "8849968223:AAFEe0LkfJcgTPq0UpW4HZD_eKSjl4ACjdY";
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
