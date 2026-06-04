import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShieldAlert, Users, Clock, Ban, FileText, LogOut, ChevronRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { amIAdmin, listUsers, adminStats } from "@/lib/admin.functions";

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
    navigate({ to: "/admin_/$userId", params: { userId } });
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
