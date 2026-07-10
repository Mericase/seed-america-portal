import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, ShieldAlert, Users, Clock, Ban, FileText,
  LogOut, ChevronRight, ArrowLeft, Send, Bell, Upload,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Seedin America" }] }),
  component: AdminPage,
});

type UserRow = {
  id: string; full_name: string; email: string; phone: string;
  tier: number; tier_status: string; requested_tier: number | null;
  balance: number; profile_status: string; created_at: string; referral_code: string;
};
type Brief = { id: string; full_name: string; email: string; tier: number };

const notificationTemplates = [
  {
    key: "upgrade_reminder",
    label: "Upgrade reminder",
    title: "Unlock your next Seedin America benefits",
    link: "/update-tier-3",
    body: "You are very close to unlocking a stronger review path for your grant journey. Completing your next tier upgrade gives your application greater priority, faster document review, higher funding consideration, and access to additional member support.\n\nPlease sign in to your dashboard and complete the remaining upgrade steps so your account can continue moving forward without delay.",
  },
  {
    key: "account_change",
    label: "Account change",
    title: "Important update on your Seedin America account",
    link: "/dashboard",
    body: "A change has been made to your Seedin America account record. Please review your dashboard to confirm that your profile, contact information, balance, and application details are accurate.\n\nIf you did not request or expect this update, contact member support immediately so our team can review your account.",
  },
  {
    key: "application_update",
    label: "Application update",
    title: "Your grant application has a new update",
    link: "/apply-grant",
    body: "There is a new update connected to your grant application. Please sign in to your dashboard to review the latest status, any pending requirements, and the next action needed from you.\n\nResponding promptly helps our review team keep your application moving without unnecessary delays.",
  },
  {
    key: "payment_update",
    label: "Balance/payment",
    title: "Your Seedin America balance has been updated",
    link: "/dashboard",
    body: "Your Seedin America member balance or payment status has been updated. Please sign in to your dashboard to review the new details and confirm that everything appears correct.\n\nIf you have questions about this update, contact member support from your dashboard.",
  },
  {
    key: "security_notice",
    label: "Security notice",
    title: "Security notice for your Seedin America account",
    link: "/dashboard",
    body: "We are sending this notice to help keep your Seedin America account secure. Please review your account information, password, and recent activity from your dashboard.\n\nIf anything looks unfamiliar, contact member support immediately so we can protect your account.",
  },
] as const;

function AdminPage() {
  const navigate = useNavigate();
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
        const staffAuth = sessionStorage.getItem("staff_admin_auth") === "true";
        if (!staffAuth) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { navigate({ to: "/signin" }); return; }
          const { data: role } = await supabase
            .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
          if (!role) { toast.error("Admin access required"); navigate({ to: "/dashboard" }); return; }
        }
        // Load stats
        const [
          { count: total },
          { count: pending },
          { count: terminated },
          { count: apps },
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tier_status", "pending"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_status", "terminated"),
          supabase.from("grant_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        setS({
          totalUsers: total ?? 0,
          pendingTierUpgrades: pending ?? 0,
          terminated: terminated ?? 0,
          pendingApplications: apps ?? 0,
        });
        setAuthChecked(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load admin");
        navigate({ to: "/dashboard" });
      }
    })();
  }, [navigate]);

  const refresh = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("profiles")
        .select("id, full_name, email, phone, tier, tier_status, requested_tier, balance, profile_status, created_at, referral_code")
        .order("created_at", { ascending: false });
      if (search.trim()) {
        const like = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},referral_code.ilike.${like}`);
      }
      if (filter === "terminated") q = q.eq("profile_status", "terminated");
      if (filter === "pending_tier") q = q.eq("tier_status", "pending");
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      setUsers((rows ?? []) as UserRow[]);
      const ids = (rows ?? []).map((r) => r.id);
      if (ids.length) {
        const { data: appsData } = await supabase.from("grant_applications").select("user_id").in("user_id", ids);
        const counts: Record<string, number> = {};
        (appsData ?? []).forEach((a) => { counts[a.user_id] = (counts[a.user_id] ?? 0) + 1; });
        setAppCounts(counts);
      }
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
  }, [search, filter, authChecked]);

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
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={async () => { sessionStorage.removeItem("staff_admin_auth"); await supabase.auth.signOut(); navigate({ to: "/signin" }); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-10">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Member Records</h1>
        <p className="mt-2 text-muted-foreground">Manage signups, verify tier upgrades, review grant applications, and moderate accounts.</p>

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
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "pending_tier" ? "Tier pending" : f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>
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
                    <tr key={u.id} onClick={() => navigate({ to: "/admin/$userId", params: { userId: u.id } })}
                      className="cursor-pointer border-t border-border transition hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">Tier {u.tier}</div>
                        {u.tier_status === "pending" && u.requested_tier && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-foreground">
                            → T{u.requested_tier} pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">${Number(u.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">{appCounts[u.id] ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${u.profile_status === "terminated" ? "bg-destructive/15 text-destructive" : "bg-forest/15 text-forest"}`}>
                          {u.profile_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground"><ChevronRight className="inline h-4 w-4" /></td>
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

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: "gold" | "forest" | "danger" }) {
  const colors = accent === "gold" ? "from-gold/15 to-gold/0 border-gold/30"
    : accent === "forest" ? "from-forest/15 to-forest/0 border-forest/30"
    : accent === "danger" ? "from-destructive/15 to-destructive/0 border-destructive/30"
    : "from-primary/10 to-transparent border-border";
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

function NotificationComposer() {
  const doSend = useServerFn(sendNotification);
  const [allUsers, setAllUsers] = useState<Brief[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [templateKey, setTemplateKey] = useState<(typeof notificationTemplates)[number]["key"] | "custom">("custom");
  const [toAll, setToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualEmailText, setManualEmailText] = useState("");
  const [manualPhoneText, setManualPhoneText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email, tier").order("full_name")
      .then(({ data }) => setAllUsers((data ?? []) as Brief[]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [allUsers, search]);

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const manualEmails = useMemo(() => extractEmails(manualEmailText), [manualEmailText]);
  const manualPhones = useMemo(() => extractPhones(manualPhoneText), [manualPhoneText]);

  const applyTemplate = (template: (typeof notificationTemplates)[number]) => {
    setTemplateKey(template.key);
    setTitle(template.title);
    setBody(template.body);
    setLink(template.link);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and message are required"); return; }
    if (!toAll && selected.size === 0 && manualEmails.length === 0 && manualPhones.length === 0) {
      toast.error("Pick at least one member or enter at least one email or phone recipient"); return;
    }
    setSending(true);
    try {
      const res = await doSend({
        data: {
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || "/dashboard",
          templateKey,
          toAll,
          userIds: toAll ? undefined : Array.from(selected),
          manualEmails,
          manualPhones,
        },
      });
      const emailFailures = res.emailFailures?.length ?? 0;
      const smsFailures = res.smsFailures?.length ?? 0;
      const parts = [
        `${res.emailed} email${res.emailed === 1 ? "" : "s"}`,
        `${res.smsSent ?? 0} SMS`,
      ];
      if (emailFailures + smsFailures > 0) {
        toast.warning(`Sent • ${parts.join(" • ")} • ${emailFailures} email issue${emailFailures === 1 ? "" : "s"} • ${smsFailures} SMS issue${smsFailures === 1 ? "" : "s"}`);
      } else {
        toast.success(`Sent to ${res.recipients} member${res.recipients === 1 ? "" : "s"} • ${parts.join(" • ")} delivered`);
      }
      setTitle(""); setBody(""); setTemplateKey("custom"); setSelected(new Set()); setManualEmailText(""); setManualPhoneText("");
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
        <span className="ml-auto text-xs text-muted-foreground">In-app • Push • Email</span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prepared templates</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {notificationTemplates.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${templateKey === template.key ? "border-forest bg-forest/10 text-forest" : "border-input bg-background text-foreground hover:bg-accent"}`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); if (templateKey !== "custom") setTemplateKey("custom"); }} maxLength={120}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="Grant application update" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea value={body} onChange={(e) => { setBody(e.target.value); if (templateKey !== "custom") setTemplateKey("custom"); }} maxLength={1800} rows={8}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="Hi! Your tier upgrade is approved…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-forest/20"
              placeholder="/dashboard" />
          </div>
          <label className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${toAll ? "border-forest bg-forest/5" : "border-border"}`}>
            <input type="checkbox" checked={toAll} onChange={(e) => setToAll(e.target.checked)} className="h-4 w-4 accent-forest" />
            <span><strong>Send to everyone</strong> <span className="text-muted-foreground">({allUsers.length} members)</span></span>
          </label>
          <button onClick={handleSend} disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-4 py-3 text-sm font-semibold text-forest-foreground disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : toAll
              ? `Send to all members${manualEmails.length ? ` + ${manualEmails.length} email${manualEmails.length === 1 ? "" : "s"}` : ""}${manualPhones.length ? ` + ${manualPhones.length} SMS` : ""}`
              : `Send to ${selected.size + manualEmails.length + manualPhones.length} recipient${selected.size + manualEmails.length + manualPhones.length === 1 ? "" : "s"}`}
          </button>
        </div>
        <div className={`flex flex-col rounded-lg border border-border ${toAll ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between border-b border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipients</p>
            <div className="flex items-center gap-2">
              <button disabled={toAll} onClick={() => setSelected(new Set(filtered.map((u) => u.id)))} className="text-xs text-forest hover:underline disabled:opacity-50">Select all</button>
              <button disabled={toAll} onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Clear</button>
            </div>
          </div>
          <div className="border-b border-border p-2">
            <input disabled={toAll} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.map((u) => (
              <label key={u.id} className={`flex cursor-pointer items-center gap-2 border-b border-border/60 px-3 py-2 text-sm hover:bg-accent/40 ${toAll ? "pointer-events-none" : ""}`}>
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} disabled={toAll} className="h-4 w-4 accent-forest" />
                <div className="flex-1">
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">T{u.tier}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No members.</p>}
          </div>
          <div className="border-t border-border bg-background/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email-only recipients</p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-semibold text-forest hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> Upload file
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const next = [manualEmailText, text].filter(Boolean).join("\n");
                    setManualEmailText(next);
                    toast.success(`${extractEmails(text).length} email${extractEmails(text).length === 1 ? "" : "s"} found in file`);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <textarea
              value={manualEmailText}
              onChange={(e) => setManualEmailText(e.target.value)}
              rows={4}
              placeholder="Type or paste email addresses separated by commas, spaces, or new lines. These receive email only — no in-app notification."
              className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-forest/20"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {manualEmails.length} valid email{manualEmails.length === 1 ? "" : "s"} ready. Manual addresses are email-only and do not create in-app notifications.
            </p>
          </div>
          <div className="border-t border-border bg-background/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SMS-only recipients (phone numbers)</p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-semibold text-forest hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> Upload file
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const next = [manualPhoneText, text].filter(Boolean).join("\n");
                    setManualPhoneText(next);
                    toast.success(`${extractPhones(text).length} phone number${extractPhones(text).length === 1 ? "" : "s"} found in file`);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <textarea
              value={manualPhoneText}
              onChange={(e) => setManualPhoneText(e.target.value)}
              rows={4}
              placeholder="Type or paste phone numbers separated by commas, spaces, or new lines. Use E.164 format (e.g. +15551234567). 10-digit US numbers get +1 automatically. SMS only — no in-app notification."
              className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-forest/20"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {manualPhones.length} valid number{manualPhones.length === 1 ? "" : "s"} ready. SMS delivery requires a linked Twilio connection.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function extractEmails(input: string): string[] {
  return Array.from(
    new Set(
      (input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
        .map((email) => email.trim().toLowerCase()),
    ),
  );
}

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function extractPhones(input: string): string[] {
  const parts = input.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const p of parts) {
    const n = normalizePhone(p);
    if (n) out.add(n);
  }
  return Array.from(out);
}
