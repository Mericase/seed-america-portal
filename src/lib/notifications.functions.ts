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

export const markOneRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null);
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

    // ── resolve recipients ──────────────────────────────────────────────────
    let userIds: string[] = [];
    if (data.toAll) {
      const { data: rows } = await supabaseAdmin.from("profiles").select("id");
      userIds = (rows ?? []).map((r) => r.id);
    } else {
      userIds = data.userIds ?? [];
    }
    if (userIds.length === 0) throw new Error("Select at least one recipient");

    // ── insert in-app notifications ─────────────────────────────────────────
    const rows = userIds.map((uid) => ({
      user_id: uid,
      title: data.title,
      body: data.body,
      link: data.link ?? "/dashboard",
    }));
    const { error: insErr } = await supabaseAdmin.from("notifications").insert(rows);
    if (insErr) throw new Error(insErr.message);

    // ── web push (best-effort) ──────────────────────────────────────────────
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
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
    }

    // ── email (best-effort) ─────────────────────────────────────────────────
    let emailed = 0;
    const emailFailures: { email: string; status?: number; error: string }[] = [];

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM || "Seedin America <support@seedinamerica.org>";

    if (!RESEND_API_KEY) {
      console.error("[notifications] RESEND_API_KEY is not set — all emails skipped");
      emailFailures.push({ email: "*", error: "RESEND_API_KEY missing on server" });
    } else {
      try {
        const { renderBrandedEmail } = await import("./email.server");

        const sendNotificationEmail = async (
          to: string,
          subject: string,
          html: string,
        ): Promise<{ ok: boolean; id?: string; error?: string; status?: number }> => {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: RESEND_FROM,
                to: [to],
                subject,
                html,
              }),
            });

            const bodyText = await res.text();
            let parsed: any = null;
            try { parsed = JSON.parse(bodyText); } catch { /* non-JSON body */ }

            if (!res.ok) {
              const errMsg = parsed?.message || bodyText || `HTTP ${res.status}`;
              console.error(`[notifications] Resend error ${res.status} for ${to}: ${errMsg}`);
              return { ok: false, status: res.status, error: errMsg };
            }

            return { ok: true, id: parsed?.id };
          } catch (networkErr: any) {
            console.error(`[notifications] Resend request failed for ${to}:`, networkErr);
            return { ok: false, error: networkErr?.message ?? "network error" };
          }
        };

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const escape = (s: string) =>
          s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

        await Promise.all((profiles ?? []).map(async (p) => {
          if (!p.email) return;
          const firstName = (p.full_name || "").split(" ")[0] || "there";
          const html = renderBrandedEmail({
            preheader: data.title,
            heading: data.title,
            intro: `Hello ${escape(firstName)}, you have a new notification from Seedin America.`,
            bodyHtml: `
              <p style="white-space:pre-wrap;margin:0 0 16px;">${escape(data.body)}</p>
              <p style="margin:0;color:#555;font-size:14px;">
                Sign in to your dashboard to view the full notification and any further details.
              </p>
            `,
            ctaLabel: "View notification",
            ctaUrl: `https://seedinamerica.org${data.link ?? "/dashboard"}`,
          });

          const result = await sendNotificationEmail(p.email, data.title, html);
          if (result.ok) {
            emailed++;
          } else {
            emailFailures.push({ email: p.email, status: result.status, error: result.error ?? "unknown error" });
          }
        }));
      } catch (e: any) {
        console.error("[notifications] email send error", e);
        emailFailures.push({ email: "*", error: e?.message ?? "unexpected error" });
      }
    }

    return {
      ok: true,
      recipients: userIds.length,
      pushed,
      emailed,
      emailFailures, // inspect this in the admin UI / network tab to see exactly why sends failed
    };
  });
