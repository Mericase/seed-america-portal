import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

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
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response("Not configured", { status: 500 });

        const expected = deriveWebhookSecret(TELEGRAM_API_KEY);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const message = update?.message ?? update?.edited_message;
        const text: string | undefined = message?.text;
        const replyTo = message?.reply_to_message;
        if (!text || !replyTo?.message_id) {
          return Response.json({ ok: true, ignored: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up the original user from the message we sent
        const { data: map } = await supabaseAdmin
          .from("telegram_message_map")
          .select("user_id")
          .eq("telegram_message_id", replyTo.message_id)
          .maybeSingle();

        if (!map?.user_id) {
          // Fallback: parse "uid: <uuid>" from the quoted message text
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
