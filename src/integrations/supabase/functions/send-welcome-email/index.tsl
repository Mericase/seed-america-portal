// supabase/functions/send-welcome-email/index.ts
// Deploy with: supabase functions deploy send-welcome-email
// Set secret with: supabase secrets set RESEND_API_KEY=re_7pB2Rfui_LJKQdFJm9ZXRyDomCwbUy2G6

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HERO_URL = "https://seedinamerica.org/email-assets/hero-seedling.jpeg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    // Verify the JWT and get the user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    // Use service role to read the profile (bypasses RLS)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email, referral_code")
      .eq("id", user.id)
      .maybeSingle();

    const toEmail = profile?.email ?? user.email;
    if (!toEmail) return json({ error: "no_email" }, 400);

    const firstName = (profile?.full_name ?? "").split(" ")[0] || "Member";
    const referralCode = profile?.referral_code ?? "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Seedin America <info@seedinamerica.org>",
        to: [toEmail],
        subject: `Welcome to Seedin America, ${firstName} — Your Seed Is Planted`,
        html: buildWelcomeHtml(firstName, toEmail, referralCode),
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[email] Resend error:", res.status, txt);
      return json({ ok: false, error: txt }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[email] unexpected error:", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function buildWelcomeHtml(firstName: string, email: string, referralCode: string): string {
  const code = referralCode || "—";
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>` +
    `<body style="margin:0;padding:0;background:#0f2a1a;font-family:Arial,sans-serif;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2a1a;padding:40px 16px;"><tr><td align="center">` +
    `<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;">` +
    `<tr><td style="line-height:0;"><img src="${HERO_URL}" alt="Seedin America" width="560" style="width:100%;display:block;" /></td></tr>` +
    `<tr><td style="background:linear-gradient(135deg,#0f2a1a,#1a3a26);padding:32px 40px;text-align:center;">` +
    `<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#c9a84c;">Seedin America</p>` +
    `<h1 style="margin:8px 0 6px;font-size:26px;font-weight:700;color:#fff;">Welcome, ${firstName}!</h1>` +
    `<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">Your seed has been planted. Your account is ready.</p></td></tr>` +
    `<tr><td style="background:#fff;padding:36px 40px 24px;">` +
    `<p style="font-size:15px;color:#374151;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>` +
    `<p style="font-size:15px;color:#374151;line-height:1.7;">Welcome to Seedin America. Your account has been successfully created. You are now one step closer to accessing the capital you deserve.</p>` +
    `<p style="font-size:15px;color:#374151;line-height:1.7;">Every dollar disbursed through our program is a <strong>pure grant</strong> &mdash; not a loan, not an advance. <strong>No repayment. Ever.</strong></p>` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f0;border-radius:12px;border-left:4px solid #2d6a4f;margin:20px 0;"><tr><td style="padding:20px 24px;">` +
    `<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#1a3a26;text-transform:uppercase;letter-spacing:1px;">What Happens Next</p>` +
    `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>1.</strong> Sign in to your secure member dashboard</p>` +
    `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>2.</strong> Verify your tier to unlock higher grant amounts</p>` +
    `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>3.</strong> Submit your grant application &mdash; decision in 14 business days</p>` +
    `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>4.</strong> Receive funds directly into your bank account</p>` +
    `</td></tr></table>` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(201,168,76,0.1);border-radius:12px;border:1px solid rgba(201,168,76,0.35);margin:0 0 24px;"><tr><td style="padding:20px 24px;">` +
    `<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#92700a;text-transform:uppercase;letter-spacing:1px;">Your Referral Code</p>` +
    `<p style="margin:0 0 10px;font-size:28px;font-weight:700;color:#1a3a26;letter-spacing:0.4em;font-family:monospace;">${code}</p>` +
    `<p style="margin:0;font-size:13px;color:#374151;">Share this code and earn <strong style="color:#2d6a4f;">$300</strong> for every friend who registers. They get an instant <strong style="color:#2d6a4f;">$200</strong> bonus.</p>` +
    `</td></tr></table>` +
    `<table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr>` +
    `<td style="background:linear-gradient(135deg,#1a3a26,#2d6a4f);border-radius:50px;padding:15px 40px;text-align:center;">` +
    `<a href="https://seedinamerica.org/signin" style="font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Access Your Dashboard &rarr;</a>` +
    `</td></tr></table></td></tr>` +
    `<tr><td style="background:#0f2a1a;padding:24px 40px;text-align:center;">` +
    `<p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;">Seedin America</p>` +
    `<p style="margin:0 0 8px;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;">Plant &middot; Grow &middot; Prosper</p>` +
    `<p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.6;">Sent to ${email} because you signed up at seedinamerica.org<br>` +
    `&copy; ${new Date().getFullYear()} Seedin America &middot; ` +
    `<a href="https://seedinamerica.org" style="color:rgba(201,168,76,0.6);text-decoration:none;">seedinamerica.org</a> &middot; ` +
    `<a href="mailto:info@seedinamerica.org" style="color:rgba(201,168,76,0.6);text-decoration:none;">info@seedinamerica.org</a>` +
    `</p></td></tr></table></td></tr></table></body></html>`
  );
}
