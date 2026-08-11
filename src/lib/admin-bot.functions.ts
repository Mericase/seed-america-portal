import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  kind: z.enum([
    "tier_upgrade_request",
    "withdrawal_request",
    "grant_application",
    "password_changed",
    "profile_updated",
  ]),
  amount: z.number().nullable().optional(),
  tier: z.number().int().nullable().optional(),
  detail: z.string().max(400).nullable().optional(),
});

/**
 * Reports a member-initiated activity to the admin Telegram bot.
 * The member's identity is resolved server-side from their session — never trusted
 * from the client payload.
 */
export const reportMemberEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => schema.parse(i))
  .handler(async ({ context, data }) => {
    const { sendAdminAlert, memberIdentity, usd } = await import("./admin-bot.server");
    const who = await memberIdentity(context.userId);
    const base: Array<[string, string | number | null | undefined]> = [
      ["Name", who.name],
      ["Email", who.email],
      ["Phone", who.phone],
      ["Current tier", who.tier],
    ];

    switch (data.kind) {
      case "tier_upgrade_request":
        await sendAdminAlert({
          emoji: "📤",
          title: `Tier ${data.tier ?? 2} upgrade request`,
          fields: [...base, ["Requested tier", data.tier ?? 2], ["Details", data.detail]],
          note: "Verification documents submitted — review in the admin console.",
        });
        break;
      case "withdrawal_request":
        await sendAdminAlert({
          emoji: "🏧",
          title: "Withdrawal request",
          fields: [
            ...base,
            ["Amount requested", usd(data.amount ?? null)],
            ["Available balance", usd(who.balance)],
            ["Bank / details", data.detail],
          ],
          urgent: true,
        });
        break;
      case "grant_application":
        await sendAdminAlert({
          emoji: "📝",
          title: "New grant application",
          fields: [
            ...base,
            ["Amount requested", usd(data.amount ?? null)],
            ["Grant type", data.detail],
          ],
        });
        break;
      case "password_changed":
        await sendAdminAlert({
          emoji: "🔐",
          title: "Member changed their password",
          fields: base,
        });
        break;
      case "profile_updated":
        await sendAdminAlert({
          emoji: "✏️",
          title: "Member updated their profile",
          fields: [...base, ["Changed", data.detail]],
        });
        break;
    }
    return { ok: true };
  });
