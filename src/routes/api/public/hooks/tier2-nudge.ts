import { createFileRoute } from "@tanstack/react-router";

const NUDGE_TAG = "[tier2-upgrade-nudge]";
const COOLDOWN_DAYS = 7;

export const Route = createFileRoute("/api/public/hooks/tier2-nudge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const { serverEnv } = await import("@/lib/runtime-env.server");
        const expected = serverEnv("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendEmail, renderBrandedEmail } = await import("@/lib/email.server");

        // Tier 2 users
        const { data: users, error } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, tier")
          .eq("tier", 2);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
        let notified = 0;
        let emailed = 0;
        const escape = (s: string) =>
          s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

        for (const u of users ?? []) {
          // Skip if we already nudged them within the cooldown window
          const { data: recent } = await supabaseAdmin
            .from("notifications")
            .select("id")
            .eq("user_id", u.id)
            .ilike("body", `%${NUDGE_TAG}%`)
            .gte("created_at", cutoff)
            .limit(1);
          if (recent && recent.length > 0) continue;

          const firstName = (u.full_name || "").split(" ")[0] || "there";

          const title = "Unlock Tier 3 — faster review & bigger benefits";
          const body =
            `Hi ${firstName}, you're just one step away from Tier 3. Upgrading unlocks priority grant review (48-hour turnaround), a higher grant cap, dedicated advisor support, and a $500 loyalty bonus on approval. Don't stop now — finish your upgrade today. ${NUDGE_TAG}`;

          await supabaseAdmin.from("notifications").insert({
            user_id: u.id,
            title,
            body,
            link: "/update-tier-3",
          });
          notified++;

          if (u.email) {
            const bodyHtml = `
              <p style="margin:0 0 16px;">Hi ${escape(firstName)},</p>
              <p style="margin:0 0 16px;">
                You've made it to <strong>Tier 2</strong> — but the biggest benefits are reserved for <strong>Tier 3</strong> applicants.
                Don't stop now. Complete your upgrade to unlock the fastest path to your grant funds.
              </p>

              <div style="background:linear-gradient(135deg,#f0f7f0 0%,#e6f0e6 100%);border:1px solid rgba(45,106,79,0.25);border-radius:14px;padding:18px 20px;margin:18px 0;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#1a3a26;letter-spacing:0.18em;text-transform:uppercase;">Tier 3 Benefits</p>
                <ul style="margin:0;padding-left:18px;color:#1a3a26;font-size:14px;line-height:1.7;">
                  <li><strong>48-hour priority review</strong> on your grant application</li>
                  <li><strong>Higher grant cap</strong> — access larger funding tranches</li>
                  <li><strong>Dedicated advisor</strong> assigned to your application</li>
                  <li><strong>$500 loyalty bonus</strong> credited on Tier 3 approval</li>
                  <li>Early access to new federal grant programs as they open</li>
                </ul>
              </div>

              <p style="margin:0 0 8px;color:#555;font-size:14px;">
                The upgrade takes just a few minutes and locks in your priority slot.
              </p>
            `;
            const html = renderBrandedEmail({
              preheader: "Finish your Tier 3 upgrade — faster review, higher grant cap, $500 bonus.",
              heading: "You're one step from Tier 3",
              intro: "Don't stop now — the biggest benefits are waiting.",
              bodyHtml,
              ctaLabel: "Upgrade to Tier 3",
              ctaUrl: "https://seedinamerica.org/update-tier-3",
              categoryLabel: "Upgrade Reminder",
            });
            const r = await sendEmail({ to: u.email, subject: title, html });
            if (r.ok) emailed++;
          }
        }

        return Response.json({ ok: true, candidates: users?.length ?? 0, notified, emailed });
      },
    },
  },
});
