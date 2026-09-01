import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, AtSign, Bell, CheckCircle2, Circle, Clock, Loader2, Lock, LogOut,
  Mail, Phone, MapPin, Save, ShieldCheck, User, XCircle, FileText,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — Seedin America" },
      { name: "description", content: "Manage your username, contact details, password, notifications and track your grant application stage." },
      { property: "og:title", content: "Account Settings — Seedin America" },
      { property: "og:description", content: "Manage your Seedin America member account and track your grant application progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  username: string | null;
  referral_code: string;
  tier: number;
  tier_status: string;
  balance: number;
}

interface AppRow {
  id: string;
  status: string;
  grant_type: string | null;
  amount_requested: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [app, setApp] = useState<AppRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }

      const [{ data: p, error }, { data: apps }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("grant_applications").select("*").eq("user_id", session.user.id)
          .order("created_at", { ascending: false }).limit(1),
      ]);
      if (error) toast.error(error.message);
      if (!mounted) return;
      setProfile((p as unknown as ProfileRow) ?? null);
      setApp(((apps ?? [])[0] as unknown as AppRow) ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }
  if (!profile) {
    return <div className="grid min-h-screen place-items-center bg-background p-6 text-center text-muted-foreground">Account not available. Please refresh.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 pt-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Member Settings</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">Account & Preferences</h1>
        </div>

        <ApplicationProgress app={app} />
        <UsernameCard profile={profile} onSaved={(u) => setProfile({ ...profile, username: u })} />
        <ContactCard profile={profile} onSaved={(patch) => setProfile({ ...profile, ...patch })} />
        <PasswordCard />
        <PreferencesCard />
        <AccountSummary profile={profile} />

        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/signin", replace: true }); }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" /> Sign out of this device
        </button>
      </main>
    </div>
  );
}

/* ── Grant application progress ───────────────────────────── */

const STAGES = [
  { key: "submitted", label: "Application submitted", desc: "We received your application." },
  { key: "review", label: "Under review", desc: "Our committee is verifying your details." },
  { key: "approved", label: "Approved", desc: "Your grant has been approved and credited." },
  { key: "disbursed", label: "Disbursed", desc: "Funds released to your bank account." },
];

function ApplicationProgress({ app }: { app: AppRow | null }) {
  if (!app) {
    return (
      <Card icon={<FileText className="h-4 w-4" />} title="Grant application status">
        <p className="text-sm text-muted-foreground">
          You haven't submitted a grant application yet. Once you apply, your progress will appear here and you'll be
          notified at every stage.
        </p>
        <Link to="/apply-grant" className="mt-4 inline-flex rounded-full bg-gradient-forest px-5 py-2.5 text-sm font-semibold text-forest-foreground">
          Start an application
        </Link>
      </Card>
    );
  }

  const rejected = app.status === "rejected";
  const stageIndex = rejected ? 1 : app.status === "disbursed" ? 3 : app.status === "approved" ? 2 : 1;
  const pct = rejected ? 50 : ((stageIndex + 1) / STAGES.length) * 100;

  return (
    <Card icon={<FileText className="h-4 w-4" />} title="Grant application status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl font-semibold">
          {app.grant_type ?? "Grant"}{app.amount_requested ? ` · $${Number(app.amount_requested).toLocaleString()}` : ""}
        </p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
          rejected ? "bg-destructive/10 text-destructive"
          : app.status === "approved" || app.status === "disbursed" ? "bg-forest/10 text-forest"
          : "bg-gold/20 text-gold-foreground"}`}>
          {app.status}
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${rejected ? "bg-destructive" : "bg-gradient-forest"}`} style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-5 space-y-4">
        {STAGES.map((s, i) => {
          const done = !rejected && i <= stageIndex;
          const current = !rejected && i === stageIndex;
          return (
            <li key={s.key} className="flex gap-3">
              <span className="mt-0.5">
                {done ? <CheckCircle2 className={`h-5 w-5 ${current ? "text-gold" : "text-forest"}`} />
                  : <Circle className="h-5 w-5 text-muted-foreground/40" />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          );
        })}
        {rejected && (
          <li className="flex gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Not approved</p>
              <p className="text-xs text-muted-foreground">You may reapply after reviewing the notes below.</p>
            </div>
          </li>
        )}
      </ol>

      {app.admin_notes && (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Note from Member Services</p>
          <p className="mt-1 text-sm text-foreground/90">{app.admin_notes}</p>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Last updated {new Date(app.updated_at ?? app.created_at).toLocaleString()}
      </p>
    </Card>
  );
}

/* ── Username ─────────────────────────────────────────────── */

function UsernameCard({ profile, onSaved }: { profile: ProfileRow; onSaved: (u: string) => void }) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = username.trim();
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(value)) {
      return toast.error("Username must be 3–24 characters — letters, numbers, underscore or dot only.");
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: value }).eq("id", profile.id);
    setSaving(false);
    if (error) {
      return toast.error(
        error.message.toLowerCase().includes("duplicate") || error.code === "23505"
          ? "That username is already taken. Try another."
          : error.message,
      );
    }
    onSaved(value);
    toast.success("Username saved — you can now sign in with it.");
  };

  return (
    <Card icon={<AtSign className="h-4 w-4" />} title="Username">
      <p className="text-sm text-muted-foreground">
        Choose a username to sign in with instead of your email address.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            className="w-full rounded-lg border border-input bg-background py-3 pl-8 pr-4 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
    </Card>
  );
}

/* ── Contact details ──────────────────────────────────────── */

function ContactCard({ profile, onSaved }: { profile: ProfileRow; onSaved: (p: Partial<ProfileRow>) => void }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const patch = { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() };
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved(patch);
    toast.success("Contact details updated");
  };

  return (
    <Card icon={<User className="h-4 w-4" />} title="Personal details">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" icon={<User className="h-4 w-4" />} value={fullName} onChange={setFullName} />
        <Field label="Phone" icon={<Phone className="h-4 w-4" />} value={phone} onChange={setPhone} />
        <div className="sm:col-span-2">
          <Field label="Address" icon={<MapPin className="h-4 w-4" />} value={address} onChange={setAddress} />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> {profile.email}
            <span className="ml-auto text-xs">Contact support to change</span>
          </div>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
      </button>
    </Card>
  );
}

/* ── Password ─────────────────────────────────────────────── */

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw !== confirm) return toast.error("Passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPw(""); setConfirm("");
    toast.success("Password updated");
  };

  return (
    <Card icon={<Lock className="h-4 w-4" />} title="Password & security">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
        </label>
      </div>
      <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Update password
      </button>
    </Card>
  );
}

/* ── Preferences ──────────────────────────────────────────── */

function PreferencesCard() {
  return (
    <Card icon={<Bell className="h-4 w-4" />} title="Notifications">
      <p className="text-sm text-muted-foreground">
        Manage alerts for grant updates, tier approvals and account changes. Turn on device push to be notified even
        when you're not on the site.
      </p>
      <Link to="/notifications" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-3 text-sm font-semibold hover:bg-accent">
        <Bell className="h-4 w-4" /> Open notification centre
      </Link>
    </Card>
  );
}

/* ── Connect email ────────────────────────────────────────── */

function ConnectEmailCard() {
  return (
    <Card icon={<Mail className="h-4 w-4" />} title="Connected email">
      <p className="text-sm text-muted-foreground">
        Link your everyday email inbox to Seedin America for faster verification and secure correspondence.
      </p>
      <button
        onClick={() => toast.info("Email connection is coming soon.", { description: "We'll notify you the moment it's available." })}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-forest px-5 py-3 text-sm font-semibold text-forest-foreground hover:opacity-95"
      >
        <Mail className="h-4 w-4" /> Connect email
      </button>
    </Card>
  );
}

/* ── Summary ──────────────────────────────────────────────── */

function AccountSummary({ profile }: { profile: ProfileRow }) {
  const tierCap: Record<number, string> = { 1: "Up to $500", 2: "Up to $15,000", 3: "Unlimited" };
  return (
    <Card icon={<ShieldCheck className="h-4 w-4" />} title="Membership">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tier" value={`Tier ${profile.tier}`} sub={tierCap[profile.tier] ?? ""} />
        <Stat label="Balance" value={`$${Number(profile.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} sub="Available" />
        <Stat label="Referral code" value={profile.referral_code} sub="Share & earn $300" />
      </div>
      {profile.tier < 3 && (
        <Link to={profile.tier >= 2 ? "/update-tier-3" : "/upgrade-tier"} className="mt-4 inline-flex rounded-full bg-gradient-forest px-5 py-2.5 text-sm font-semibold text-forest-foreground">
          Upgrade to Tier {profile.tier >= 2 ? 3 : 2}
        </Link>
      )}
    </Card>
  );
}

/* ── Primitives ───────────────────────────────────────────── */

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-forest">{icon}</span> {title}
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
      </div>
    </label>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
