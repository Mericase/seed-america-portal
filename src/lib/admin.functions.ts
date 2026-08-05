import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

function normalizeVerificationPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let path = value.trim();
  if (!path) return null;

  try {
    const parsed = new URL(path);
    path = parsed.pathname;
  } catch {
    // Already a storage object path.
  }

  path = path.split("?")[0] ?? path;

  const markers = [
    "/storage/v1/object/sign/verification/",
    "/storage/v1/object/public/verification/",
    "/object/sign/verification/",
    "/object/public/verification/",
    "verification/",
  ];
  for (const marker of markers) {
    const idx = path.indexOf(marker);
    if (idx >= 0) {
      path = path.slice(idx + marker.length);
      break;
    }
  }

  path = path.replace(/^\/+/, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep original if it is not valid percent-encoding.
  }

  return path || null;
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { admin: !!data };
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { search?: string; status?: string; tierFilter?: string }) => i ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, tier, tier_status, requested_tier, balance, profile_status, created_at, referral_code")
      .order("created_at", { ascending: false });
    if (data.search && data.search.trim()) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},referral_code.ilike.${s}`);
    }
    if (data.status === "terminated") q = q.eq("profile_status", "terminated");
    if (data.status === "active") q = q.eq("profile_status", "active");
    if (data.status === "pending_tier") q = q.eq("tier_status", "pending");

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Count grant apps per user
    const ids = (rows ?? []).map((r) => r.id);
    let appCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: apps } = await supabaseAdmin
        .from("grant_applications")
        .select("user_id")
        .in("user_id", ids);
      (apps ?? []).forEach((a) => {
        appCounts[a.user_id] = (appCounts[a.user_id] ?? 0) + 1;
      });
    }
    return { users: rows ?? [], appCounts };
  });

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("User not found");

    const { data: apps } = await supabaseAdmin
      .from("grant_applications")
      .select("*")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false });

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    // Referrer details
    let referrer: { full_name: string; email: string; referral_code: string } | null = null;
    if (profile.referred_by) {
      const { data: r } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, referral_code")
        .eq("referral_code", profile.referred_by)
        .maybeSingle();
      referrer = r ?? null;
    }

    // Count referrals
    const { count: referralCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", profile.referral_code);

    // Signed URLs for verification documents. Profiles may contain either the
    // raw storage path used by new uploads or an older public/signed URL. Always
    // normalize back to the object path before signing so current and legacy Tier
    // 2 uploads open correctly in the admin console.
    const signed: Record<string, string | null> = { id_front_url: null, id_back_url: null, ssn_card_url: null, selfie_url: null };
    for (const key of ["id_front_url", "id_back_url", "ssn_card_url", "selfie_url"] as const) {
      const path = normalizeVerificationPath((profile as Record<string, unknown>)[key]);
      if (path) {
        const { data: s, error: signError } = await supabaseAdmin.storage
          .from("verification")
          .createSignedUrl(path, 60 * 60 * 24);
        if (signError) console.error(`[admin] failed to sign verification file ${key}:`, signError.message);
        signed[key] = s?.signedUrl ?? null;
      }
    }

    return {
      profile,
      applications: apps ?? [],
      roles: (roles ?? []).map((r) => r.role),
      referrer,
      referralCount: referralCount ?? 0,
      signedUrls: signed,
    };
  });

export const approveTierUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("requested_tier, tier").eq("id", data.userId).maybeSingle();
    if (!p) throw new Error("User not found");
    const newTier = p.requested_tier && p.requested_tier > p.tier ? p.requested_tier : p.tier;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tier: newTier, tier_status: "active", requested_tier: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange({
      userId: data.userId,
      title: `Tier ${newTier} verification approved`,
      body: `Great news — your account has been upgraded to Tier ${newTier}.\n\nYour verification documents were reviewed and approved by Member Services. Your new tier benefits and limits are now active on your account.\n\nPlease sign in and review your dashboard to confirm the change.`,
      categoryLabel: "Account Change",
    });
    return { ok: true, tier: newTier };
  });

export const rejectTierUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tier_status: "rejected", requested_tier: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange({
      userId: data.userId,
      title: "Tier upgrade request not approved",
      body: `Your recent tier upgrade request could not be approved at this time.\n\nThis is usually due to unclear or incomplete verification documents. You may submit a new request with clearer documents at any time.\n\nPlease sign in and review your account for details.`,
      categoryLabel: "Account Change",
    });
    return { ok: true };
  });

export const setUserTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; tier: number }) =>
    z.object({ userId: z.string().uuid(), tier: z.number().int().min(1).max(3) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tier: data.tier, tier_status: "active", requested_tier: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange({
      userId: data.userId,
      title: `Your account tier is now Tier ${data.tier}`,
      body: `Member Services has updated your membership tier to Tier ${data.tier}.\n\nYour grant eligibility and limits have been adjusted accordingly.\n\nPlease sign in and review your dashboard to confirm this change.`,
      categoryLabel: "Account Change",
    });
    return { ok: true };
  });

export const updateBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; balance: number }) =>
    z.object({ userId: z.string().uuid(), balance: z.number().min(0) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("profiles").select("balance").eq("id", data.userId).maybeSingle();
    const { error } = await supabaseAdmin.from("profiles").update({ balance: data.balance }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange, formatUsd } = await import("./account-alerts.server");
    const prev = Number(before?.balance ?? 0);
    const diff = data.balance - prev;
    const movement = diff === 0
      ? "Your balance was reviewed and confirmed."
      : `${diff > 0 ? "Credit" : "Adjustment"}: ${diff > 0 ? "+" : "-"}${formatUsd(Math.abs(diff))}`;
    await notifyAccountChange({
      userId: data.userId,
      title: "Your account balance has been updated",
      body: `Member Services has updated the available balance on your Seedin America account.\n\nPrevious balance: ${formatUsd(prev)}\nNew balance: ${formatUsd(data.balance)}\n${movement}\n\nPlease sign in and review your dashboard to confirm this change.`,
      categoryLabel: "Balance & Payment Update",
    });
    return { ok: true };
  });

export const terminateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot terminate yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ profile_status: "terminated" }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange({
      userId: data.userId,
      title: "Your membership has been suspended",
      body: `Your Seedin America membership has been suspended by Member Services and access to your dashboard is currently restricted.\n\nIf you believe this was done in error, reply to this message or contact Member Services at info@seedinamerica.org for a review.`,
      categoryLabel: "Security Notice",
    });
    // Also sign them out of all sessions
    await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    return { ok: true };
  });

export const restoreUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ profile_status: "active" }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { notifyAccountChange } = await import("./account-alerts.server");
    await notifyAccountChange({
      userId: data.userId,
      title: "Your membership has been reinstated",
      body: `Good news — your Seedin America membership has been restored and full access to your dashboard is active again.\n\nPlease sign in and review your account.`,
      categoryLabel: "Account Change",
    });
    return { ok: true };
  });


export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { applicationId: string; status: string; notes?: string }) =>
    z.object({
      applicationId: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "disbursed"]),
      notes: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("grant_applications")
      .update({ status: data.status, admin_notes: data.notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot revoke your own admin role");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: total }, { count: pending }, { count: terminated }, { count: apps }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("tier_status", "pending"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("profile_status", "terminated"),
      supabaseAdmin.from("grant_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    return {
      totalUsers: total ?? 0,
      pendingTierUpgrades: pending ?? 0,
      terminated: terminated ?? 0,
      pendingApplications: apps ?? 0,
    };
  });
