import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { body: string }) =>
    z.object({ body: z.string().trim().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTelegramSupportMessage } = await import("./telegram.server");

    // Look up user info for the Telegram header
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    // Insert outgoing message
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("support_messages")
      .insert({ user_id: context.userId, direction: "out", body: data.body })
      .select("id, created_at")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Forward to Telegram (best-effort; chat still records the message even if TG fails)
    try {
      const { messageId } = await sendTelegramSupportMessage({
        userName: profile?.full_name ?? "Member",
        userEmail: profile?.email ?? "",
        userId: context.userId,
        text: data.body,
      });
      await supabaseAdmin
        .from("telegram_message_map")
        .upsert({ telegram_message_id: messageId, user_id: context.userId });
    } catch (e) {
      console.error("[support] telegram forward failed", e);
    }

    return { ok: true, id: inserted.id, created_at: inserted.created_at };
  });

export const listSupportMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .select("id, direction, body, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return { messages: data ?? [] };
  });

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, renderBrandedEmail } = await import("./email.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, referral_code")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.email) return { ok: false, error: "no_email" };

    const firstName = (profile.full_name || "").split(" ")[0] || "there";
    const html = renderBrandedEmail({
      preheader: "Welcome to Seedin America — your journey to growth starts now.",
      heading: `Welcome, ${firstName}.`,
      intro:
        "Thank you for joining <strong>Seedin America</strong>. Your account has been successfully created and you're now part of a community committed to expanding access to capital for entrepreneurs across the country.",
      bodyHtml: `
        <p>Here's what you can do right now:</p>
        <ul style="padding-left:20px;margin:12px 0;">
          <li style="margin-bottom:8px;"><strong>Apply for a grant</strong> tailored to your tier.</li>
          <li style="margin-bottom:8px;"><strong>Invite friends</strong> with your referral code <code style="background:#f4f1e8;padding:2px 8px;border-radius:6px;color:#0f6b3e;font-weight:600;">${profile.referral_code ?? ""}</code> — you earn $300 per verified signup, and they get $200 instantly.</li>
          <li style="margin-bottom:8px;"><strong>Upgrade your tier</strong> to unlock larger grant amounts and withdrawal capabilities.</li>
        </ul>
        <p style="margin-top:20px;">If you ever need support, simply reply to this email or use the in-app chat — our team is here for you.</p>
      `,
      ctaLabel: "Open your dashboard",
      ctaUrl: "https://seedinamerica.org/dashboard",
    });

    const r = await sendEmail({
      to: profile.email,
      subject: "Welcome to Seedin America 🌱",
      html,
    });
    return r;
  });
