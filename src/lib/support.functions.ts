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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("support_messages")
      .insert({ user_id: context.userId, direction: "out", body: data.body })
      .select("id, created_at")
      .single();
    if (insErr) throw new Error(insErr.message);

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

// sendWelcomeEmail has been removed from here.
// It is now handled entirely by the Supabase Edge Function at:
// supabase/functions/send-welcome-email/index.ts
// Called from signup.tsx via: supabase.functions.invoke("send-welcome-email")
