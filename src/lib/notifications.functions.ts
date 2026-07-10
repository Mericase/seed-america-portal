import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
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
    await context.supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId).is("read_at", null);
    return { ok: true };
  });

export const markOneRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await context.supabase.from("notifications")
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
    await context.supabase.from("push_subscriptions")
      .upsert(
        { user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    return { ok: true };
  });

export const listUsersBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles").select("id, full_name, email, tier")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });

const templateLabels: Record<string, string> = {
  custom: "Official Member Notice",
  upgrade_reminder: "Upgrade Reminder",
  account_change: "Account Change",
  application_update: "Application Update",
  payment_update: "Balance & Payment Update",
  security_notice: "Security Notice",
};

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { title: string; body: string; link?: string; userIds?: string[]; toAll?: boolean; templateKey?: string; manualEmails?: string[]; manualPhones?: string[] }) =>
    z.object({
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().min(1).max(1800),
      link: z.string().max(500).optional(),
      userIds: z.array(z.string().uuid()).max(5000).optional(),
      toAll: z.boolean().optional(),
      manualEmails: z.array(z.string().trim().toLowerCase().email().max(255)).max(1000).optional(),
      manualPhones: z.array(z.string().trim().min(5).max(20)).max(1000).optional(),
      templateKey: z.enum(["custom", "upgrade_reminder", "account_change", "application_update", "payment_update", "security_notice"]).optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sendWebPush } = await import("./push.server");

    // ── resolve recipients ──────────────────────────────────────────────────
    let userIds: string[] = [];
    if (data.toAll) {
      const { data: rows } = await context.supabase.from("profiles").select("id");
      userIds = (rows ?? []).map((r) => r.id);
    } else {
      userIds = data.userIds ?? [];
    }
    const manualEmails = Array.from(new Set(data.manualEmails ?? []));
    const { normalizePhone } = await import("./sms.server");
    const manualPhones = Array.from(new Set((data.manualPhones ?? [])
      .map((p) => normalizePhone(p))
      .filter((p): p is string => Boolean(p))));
    if (userIds.length === 0 && manualEmails.length === 0 && manualPhones.length === 0) {
      throw new Error("Select at least one member or enter at least one email or phone recipient");
    }

    // ── insert in-app notifications ─────────────────────────────────────────
    if (userIds.length > 0) {
      const rows = userIds.map((uid) => ({
        user_id: uid,
        title: data.title,
        body: data.body,
        link: data.link ?? "/dashboard",
      }));
      const { error: insErr } = await context.supabase.from("notifications").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    // ── web push (best-effort) ──────────────────────────────────────────────
    const { data: subs } = userIds.length
      ? await context.supabase
          .from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", userIds)
      : { data: [] };
    let pushed = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      const r = await sendWebPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title: data.title, body: data.body, link: data.link ?? "/dashboard" },
      );
      if (r.ok) pushed++;
    }));

    // ── email (best-effort) ─────────────────────────────────────────────────
    let emailed = 0;
    const emailFailures: { email: string; error: string }[] = [];

    try {
        const { sendEmail, renderBrandedEmail, emailParagraphs, escapeHtml } = await import("./email.server");

        const { data: profiles } = userIds.length
          ? await context.supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds)
          : { data: [] };

        const recipients = [
          ...(profiles ?? []).map((p) => ({
            email: p.email,
            firstName: (p.full_name || "").split(" ")[0] || "there",
          })),
          ...manualEmails.map((email) => ({ email, firstName: "there" })),
        ].filter((p, idx, arr) => Boolean(p.email) && arr.findIndex((x) => x.email === p.email) === idx);

        await Promise.all(recipients.map(async (p) => {
          if (!p.email) return;
          const firstName = p.firstName;
          const safeLink = data.link?.startsWith("/") ? data.link : "/dashboard";
          const html = renderBrandedEmail({
            preheader: data.title,
            heading: data.title,
            intro: `Hello ${escapeHtml(firstName)}, you have a new official notification from Seedin America.`,
            categoryLabel: templateLabels[data.templateKey ?? "custom"] ?? templateLabels.custom,
            bodyHtml: `
              ${emailParagraphs(data.body)}
              <p style="margin:0;color:#555;font-size:14px;">
                Sign in to your dashboard to view the full notification and any further details.
              </p>
            `,
            ctaLabel: "View notification",
            ctaUrl: `https://seedinamerica.org${safeLink}`,
          });

          const result = await sendEmail({ to: p.email, subject: `Seedin America: ${data.title}`, html });
          if (result.ok) {
            emailed++;
          } else {
            emailFailures.push({ email: p.email, error: result.error ?? "unknown error" });
          }
        }));
    } catch (e: any) {
      console.error("[notifications] email send error", e);
      emailFailures.push({ email: "*", error: e?.message ?? "unexpected error" });
    }

    return {
      ok: true,
      recipients: userIds.length,
      manualEmailRecipients: manualEmails.length,
      pushed,
      emailed,
      emailFailures, // inspect this in the admin UI / network tab to see exactly why sends failed
    };
  });
