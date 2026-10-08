import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Unauthenticated notification sent the moment a new account is created.
 * Guarantees the admin Telegram bot is pinged even if the auto-signin session
 * or the welcome email path fails for any reason.
 */
export const notifyNewSignup = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        full_name: z.string().trim().max(200).optional().default(""),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(40).optional().default(""),
        hear_about: z.string().trim().max(80).optional().default(""),
        referral_code: z.string().trim().max(16).optional().default(""),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    try {
      const { sendAdminAlert } = await import("./admin-bot.server");
      await sendAdminAlert({
        emoji: "🌱",
        title: "New member sign-up",
        fields: [
          ["Name", data.full_name || "—"],
          ["Email", data.email],
          ["Phone", data.phone || "—"],
          ["Heard about us", data.hear_about || "—"],
          ["Referral code", data.referral_code || "—"],
        ],
      });
    } catch (e) {
      console.error("[notifyNewSignup] failed", e);
    }
    return { ok: true };
  });
