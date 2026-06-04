import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("notifications").select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { notifications: data ?? [] };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId).is("read_at", null);
    return { ok: true };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { endpoint: string; p256dh: string; auth: string }) =>
    z.object({
      endpoint: z.string().url().max(1024),
      p256dh: z.string().min(10).max(512),
      auth: z.string().min(4).max(256),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions")
      .upsert(
        { user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    return { ok: true };
  });

export const listUsersBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles").select("id, full_name, email, tier")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { title: string; body: string; link?: string; userIds?: string[]; toAll?: boolean }) =>
    z.object({
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().min(1).max(1000),
      link: z.string().max(500).optional(),
      userIds: z.array(z.string().uuid()).max(5000).optional(),
      toAll: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("./push.server");

    let userIds: string[] = [];
    if (data.toAll) {
      const { data: rows } = await supabaseAdmin.from("profiles").select("id");
      userIds = (rows ?? []).map((r) => r.id);
    } else {
      userIds = data.userIds ?? [];
    }
    if (userIds.length === 0) throw new Error("Select at least one recipient");

    const rows = userIds.map((uid) => ({
      user_id: uid, title: data.title, body: data.body, link: data.link ?? "/dashboard",
    }));
    const { error: insErr } = await supabaseAdmin.from("notifications").insert(rows);
    if (insErr) throw new Error(insErr.message);

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", userIds);

    let pushed = 0;
    const stale: string[] = [];
    await Promise.all((subs ?? []).map(async (s) => {
      const r = await sendWebPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title: data.title, body: data.body, link: data.link ?? "/dashboard" },
      );
      if (r.ok) pushed++;
      else if (r.gone) stale.push(s.id);
    }));
    if (stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);

    return { ok: true, recipients: userIds.length, pushed };
  });
