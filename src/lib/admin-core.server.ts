// Server-only helpers shared by admin server functions.
// Kept out of admin.functions.ts so that file stays a thin wrapper of
// createServerFn declarations (required for the server-function split that
// runs in the deployed Cloudflare worker).

export const PERMANENT_ADMIN_ID = "ce351161-d991-425f-8d9f-e671c9e96861";

export async function adminActor(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return `${data?.full_name ?? "Admin"} (${data?.email ?? userId})`;
}

export async function alertAdminAction(opts: {
  actorId: string;
  targetId?: string;
  emoji?: string;
  title: string;
  extra?: Array<[string, string | number | null | undefined]>;
  urgent?: boolean;
  note?: string;
}) {
  try {
    const { sendAdminAlert, memberIdentity } = await import("./admin-bot.server");
    const actor = await adminActor(opts.actorId);
    const fields: Array<[string, string | number | null | undefined]> = [["Performed by", actor]];
    if (opts.targetId) {
      const who = await memberIdentity(opts.targetId);
      fields.push(["Member", who.name], ["Email", who.email]);
    }
    await sendAdminAlert({
      emoji: opts.emoji ?? "🛠️",
      title: opts.title,
      fields: [...fields, ...(opts.extra ?? [])],
      urgent: opts.urgent,
      note: opts.note,
    });
  } catch (e) {
    console.error("[admin-bot] action alert failed", e);
  }
}

export async function assertAdmin(userId: string) {
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

export function normalizeVerificationPath(value: unknown): string | null {
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
