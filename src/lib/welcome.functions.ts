import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, renderBrandedEmail } = await import("./email.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, balance")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.email) return { ok: false, error: "no_profile" };

    const firstName = (profile.full_name || "").split(" ")[0] || "there";
    const escape = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

    const bodyHtml = `
      <p style="margin:0 0 16px;">Welcome ${escape(firstName)},</p>
      <p style="margin:0 0 16px;">
        <strong>Seedin America</strong> is a federal grant initiative that helps everyday
        Americans access non-repayable capital to strengthen their households, small
        businesses, and communities. Our mission is to make grant funding faster,
        clearer, and more accessible — with real human support at every step.
      </p>

      <div style="background:linear-gradient(135deg,#fff8e1 0%,#fdf3c8 100%);border:1px solid #e8d78a;border-radius:14px;padding:18px 20px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8a6d1a;letter-spacing:0.15em;text-transform:uppercase;">🎁 Welcome Bonus</p>
        <p style="margin:0;font-size:15px;color:#3a2f0b;line-height:1.5;">
          You've been credited with an instant <strong style="color:#1a3a26;">$50 sign-up bonus</strong> — already showing in your available balance.
        </p>
      </div>

      <p style="margin:0 0 10px;font-weight:600;color:#1a3a26;">Here's what to do next:</p>
      <ol style="margin:0 0 16px 20px;padding:0;color:#333;">
        <li style="margin-bottom:8px;">Sign in to your dashboard to review your profile.</li>
        <li style="margin-bottom:8px;">Complete your <strong>grant application</strong> to determine your eligible funding amount.</li>
        <li style="margin-bottom:8px;">Verify your identity to unlock <strong>Tier 2</strong>, then <strong>Tier 3</strong> for faster review and higher grant caps.</li>
        <li>Refer a friend and earn <strong>$300</strong> — they receive an instant <strong>$200</strong> bonus.</li>
      </ol>

      <p style="margin:0;color:#555;font-size:14px;">
        Questions? Reply to this email or reach us anytime at
        <a href="mailto:info@seedinamerica.org" style="color:#2d6a4f;">info@seedinamerica.org</a>.
      </p>
    `;

    const html = renderBrandedEmail({
      preheader: "Welcome to Seedin America — your $50 sign-up bonus is ready.",
      heading: "Welcome to Seedin America",
      intro: "Your federal grant journey starts here.",
      bodyHtml,
      ctaLabel: "Open your dashboard",
      ctaUrl: "https://seedinamerica.org/dashboard",
      categoryLabel: "Welcome Notice",
      showReferralBanner: true,
    });

    await Promise.all([
      sendEmail({ to: profile.email, subject: "Welcome to Seedin America — $50 bonus credited", html }),
      supabaseAdmin.from("notifications").insert({
        user_id: profile.id,
        title: "Welcome to Seedin America 🌱",
        body: "Your account is ready and a $50 sign-up bonus has been added to your balance. Complete your grant application to unlock your full funding.",
        link: "/dashboard",
      }),
    ]);

    return { ok: true };
  });
