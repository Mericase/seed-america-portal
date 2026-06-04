import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShieldAlert, Users, Clock, Ban, FileText, LogOut, ChevronRight, ArrowLeft, Send, Bell } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { amIAdmin, listUsers, adminStats } from "@/lib/admin.functions";
import { sendNotification, listUsersBrief } from "@/lib/notifications.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Seedin America" }] }),
  component: AdminPage,
});

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  tier: number;
  tier_status: string;
  requested_tier: number | null;
  balance: number;
  profile_status: string;
  created_at: string;
  referral_code: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listUsers);
  const stats = useServerFn(adminStats);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_tier" | "terminated">("all");
  const [s, setS] = useState({ totalUsers: 0, pendingTierUpgrades: 0, terminated: 0, pendingApplications: 0 });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Use getUser() instead of getSession() — more reliable on first load
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate({ to: "/signin" });
          return;
        }

        // Also accept staff_admin_auth (hardcoded login)
        const staffAuth = typeof window !== "undefined" && sessionStorage.getItem("staff_admin_auth") === "true";

        if (!staffAuth) {
          const res = await checkAdmin();
          if (!res.admin) {
            toast.error("Admin access required");
            navigate({ to: "/dashboard" });
            return;
          }
        }

        const st = await stats();
        setS(st);
        setAuthChecked(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load admin");
        navigate({ to: "/dashboard" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list({ data: { search, status: filter === "all" ? undefined : filter } });
      setUsers(r.users as UserRow[]);
      setAppCounts(r.appCounts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    const t = setTimeout(refresh, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, authChecked]);

  const handleRowClick = (userId: string) => {
    navigate({ to: "/admin/$userId", params: { userId } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldAlert className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Staff Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={async () => {
                sessionStorage.removeItem("staff_admin_auth");
                await supabase.auth.signOut();
                navigate({ to: "/signin" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-10">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Member Records</h1>
        <p className="mt-2 text-muted-foreground">
          Manage signups, verify tier upgrades, review grant applications, and moderate accounts.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="h-5 w-5" />} label="Total members" value={s.totalUsers} />
          <Stat icon={<Clock className="h-5 w-5" />} label="Tier upgrades pending" value={s.pendingTierUpgrades} accent="gold" />
          <Stat icon={<FileText className="h-5 w-5" />} label="Applications pending" value={s.pendingApplications} accent="forest" />
          <Stat icon={<Ban className="h-5 w-5" />} label="Terminated" value={s.terminated} accent="danger" />
        </section>

        <NotificationComposer />


        <section className="mt-8 rounded-2xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone or referral code…"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-input bg-background p-1 text-xs">
              {(["all", "pending_tier", "terminated"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 font-medium capitalize ${
                    filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "pending_tier" ? "Tier pending" : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-forest" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">No members match your filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-left">Tier</th>
                    <th className="px-4 py-3 text-left">Balance</th>
                    <th className="px-4 py-3 text-left">Apps</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => handleRowClick(u.id)}
                      className="cursor-pointer border-t border-border transition hover:bg-accent/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">Tier {u.tier}</div>
                        {u.tier_status === "pending" && u.requested_tier ? (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-foreground">
                            → T{u.requested_tier} pending
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ${Number(u.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">{appCounts[u.id] ?? 0}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.profile_status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <ChevronRight className="inline h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "gold" | "forest" | "danger";
}) {
  const colors =
    accent === "gold"
      ? "from-gold/15 to-gold/0 border-gold/30 text-gold-foreground"
      : accent === "forest"
      ? "from-forest/15 to-forest/0 border-forest/30 text-forest"
      : accent === "danger"
      ? "from-destructive/15 to-destructive/0 border-destructive/30 text-destructive"
      : "from-primary/10 to-transparent border-border text-foreground";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-card ${colors}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "terminated") {
    return (
      <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
        Terminated
      </span>
    );
  }
  return (
    <span className="rounded-full bg-forest/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest">
      Active
    </span>
  );
}

type Brief = { id: string; full_name: string; email: string; tier: number };

function NotificationComposer() {
  const loadUsers = useServerFn(listUsersBrief);
  const send = useServerFn(sendNotification);
  const [users, setUsers] = useState<Brief[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [toAll, setToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers().then((r) => setUsers(r.users as Brief[])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
  }, [users, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (!toAll && selected.size === 0) {
      toast.error("Pick at least one recipient or choose Send to all");
      return;
    }
    setSending(true);
    try {
      const r = await send({
        data: {
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || "/dashboard",
          toAll,
          userIds: toAll ? undefined : Array.from(selected),
        },
      });
      toast.success(`Sent to ${r.recipients} ${r.recipients === 1 ? "user" : "users"} · ${r.pushed} push delivered`);
      setTitle(""); setBody(""); setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Bell className="h-4 w-4 text-forest" />
        <h2 className="text-base font-semibold">Send Notification</h2>
        <span className="ml-auto text-xs text-muted-foreground">Delivered in-app and via browser push (where allowed)</span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="Grant application update" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={5}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="Hi! Your tier upgrade is approved…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="/dashboard" />
          </div>

          <label className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${toAll ? "border-forest bg-forest/5" : "border-border"}`}>
            <input type="checkbox" checked={toAll} onChange={(e) => setToAll(e.target.checked)} className="h-4 w-4 accent-forest" />
            <span><strong>Send to everyone</strong> <span className="text-muted-foreground">({users.length} members)</span></span>
          </label>

          <button onClick={handleSend} disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-4 py-3 text-sm font-semibold text-forest-foreground disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : toAll ? "Send to all members" : `Send to ${selected.size} selected`}
          </button>
        </div>

        <div className={`flex flex-col rounded-lg border border-border ${toAll ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between border-b border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipients</p>
            <div className="flex items-center gap-2">
              <button disabled={toAll} onClick={() => setSelected(new Set(filtered.map((u) => u.id)))}
                className="text-xs text-forest hover:underline disabled:opacity-50">Select all</button>
              <button disabled={toAll} onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Clear</button>
            </div>
          </div>
          <div className="border-b border-border p-2">
            <input disabled={toAll} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.map((u) => (
              <label key={u.id} className={`flex cursor-pointer items-center gap-2 border-b border-border/60 px-3 py-2 text-sm hover:bg-accent/40 ${toAll ? "pointer-events-none" : ""}`}>
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} disabled={toAll} className="h-4 w-4 accent-forest" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">T{u.tier}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No members.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
