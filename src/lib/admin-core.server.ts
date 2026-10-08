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

// Loose typing so the helper accepts both the authenticated and service-role clients.
type AnyClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
};

export async function assertAdmin(userId: string, client: AnyClient) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export function isPermanentAdmin(userId: string): boolean {
  return userId === PERMANENT_ADMIN_ID;
}

/**
 * Returns the list of member IDs an admin may act on.
 * Permanent admin: null (no restriction — can access everyone).
 * Sub-admin: array of member IDs assigned to them (empty array means none).
 */
export async function assignedMemberIds(adminId: string, client: AnyClient): Promise<string[] | null> {
  if (isPermanentAdmin(adminId)) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("assigned_admin_id", adminId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Throws unless the admin may act on this specific member.
 * Permanent admin always passes.
 */
export async function assertCanAccessMember(adminId: string, memberId: string, client: AnyClient): Promise<void> {
  if (isPermanentAdmin(adminId)) return;
  const { data, error } = await client
    .from("profiles")
    .select("assigned_admin_id")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Member not found");
  if (data.assigned_admin_id !== adminId) {
    throw new Error("This member is not assigned to you");
  }
}

/** Allocate the next free 2-character tag (A1, A2, ..., Z9, then AA, AB, ...). */
export async function allocateAdminTag(client: AnyClient): Promise<string> {
  const { data } = await client.from("user_roles").select("tag").eq("role", "admin");
  const taken = new Set(((data as Array<{ tag: string | null }>) ?? []).map((r) => r.tag).filter(Boolean) as string[]);
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (const ch of letters) {
    for (let n = 1; n <= 9; n++) {
      const t = `${ch}${n}`;
      if (!taken.has(t)) return t;
    }
  }
  // Fallback: two letters.
  for (const a of letters) for (const b of letters) {
    const t = `${a}${b}`;
    if (!taken.has(t)) return t;
  }
  throw new Error("No admin tags available");
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
