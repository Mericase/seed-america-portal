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

    // In-app notification + email via the existing notifyAccountChange helper
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange(
      {
        userId: data.userId,
        title: "Action required: upload your identity card",
        body:
          `Our compliance team requires an updated copy of your identity card.\n\n` +
          `Please sign in to your dashboard — you will be prompted to upload a clear photo of the front and back of your card.\n\n` +
          `Your account may be restricted until the documents are received and reviewed.`,
        categoryLabel: "Urgent — Action Required",
      },
      context.supabase,
    );

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
