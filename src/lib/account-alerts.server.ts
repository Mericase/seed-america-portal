// account-alerts.server.ts — Server-only. Sends in-app + push + email alerts
// whenever an admin changes something on a member's account.

type AlertOpts = {
  userId: string;
  title: string;
  body: string;
  categoryLabel?: string;
  link?: string;
};

export async function notifyAccountChange(opts: AlertOpts): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const link = opts.link ?? "/dashboard";

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", opts.userId)
      .maybeSingle();

    // In-app notification
    await supabaseAdmin.from("notifications").insert({
      user_id: opts.userId,
      title: opts.title,
      body: opts.body,
      link,
    });

    // Web push (best effort)
    try {
      const { sendWebPush } = await import("./push.server");
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", opts.userId);
      await Promise.all(
        (subs ?? []).map((s) =>
          sendWebPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            { title: opts.title, body: opts.body, link },
          ).catch(() => null),
        ),
      );
    } catch (e) {
      console.error("[account-alert] push error", e);
    }

    // Email (best effort)
    if (profile?.email) {
      try {
        const { sendEmail, renderBrandedEmail, emailParagraphs, escapeHtml } = await import("./email.server");
        const firstName = (profile.full_name || "").split(" ")[0] || "there";
        const html = renderBrandedEmail({
          preheader: opts.title,
          heading: opts.title,
          intro: `Hello ${escapeHtml(firstName)}, a change has been made to your Seedin America account.`,
          categoryLabel: opts.categoryLabel ?? "Account Change",
          bodyHtml: `
            ${emailParagraphs(opts.body)}
            <p style="margin:0;color:#555;font-size:14px;">
              Please sign in to your dashboard to review this change. If you did not expect this update,
              contact Member Services immediately at info@seedinamerica.org.
            </p>
          `,
          ctaLabel: "Review my account",
          ctaUrl: `https://seedinamerica.org${link}`,
        });
        await sendEmail({ to: profile.email, subject: `Seedin America: ${opts.title}`, html });
      } catch (e) {
        console.error("[account-alert] email error", e);
      }
    }
  } catch (e) {
    console.error("[account-alert] failed", e);
  }
}

export function formatUsd(n: number): string {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
