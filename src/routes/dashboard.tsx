import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight, Award, Copy, Gift, Loader2, LogOut, Plus, Send,
  Sparkles, TrendingUp, Wallet, X, FileText, ShieldCheck, ChevronRight, ShieldAlert
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin.functions";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Seedin America" },
      { name: "description", content: "Your member dashboard." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [referOpen, setReferOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/signin" });
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (mounted) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
      try {
        const r = await checkAdmin();
        if (mounted) setIsAdmin(r.admin);
      } catch { /* ignore */ }
    };
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/signin" });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="text-muted-foreground">Your account is being prepared. Please refresh in a moment.</p>
        </div>
      </div>
    );
  }

  const firstName = profile.full_name.split(" ")[0] || "Member";

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile.id} />
            {isAdmin && (
              <button
                onClick={() => navigate({ to: "/admin" })}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <ShieldAlert className="h-4 w-4" /> Admin
              </button>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        {/* Greeting & primary CTA */}
        <section>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl font-semibold md:text-5xl">
            {firstName}, <span className="text-forest">your seed is planted.</span>
          </h1>
          <p className="mt-2 text-muted-foreground">{profile.full_name}</p>

          <button
            onClick={() => {
              if (profile.tier < 2) {
                toast.error("You're not eligible for any grant yet.", {
                  description: "Upgrade to Tier 2 to unlock grant applications.",
                  action: { label: "Upgrade", onClick: () => navigate({ to: "/upgrade-tier" }) },
                });
                return;
              }
              navigate({ to: "/apply-grant" });
            }}
            className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-gradient-gold px-7 py-4 text-base font-semibold text-primary shadow-gold transition hover:translate-y-[-2px]"
          >
            <FileText className="h-5 w-5" />
            Apply for Grant
            <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </section>

        {/* Upgrade Tier */}
        <TierUpgradeCard
          tier={profile.tier}
          status={profile.tier_status}
          requestedTier={profile.requested_tier}
          onUpgrade={() => navigate({ to: profile.tier >= 2 ? "/update-tier-3" : "/upgrade-tier" })}
        />


        {/* Referral banner */}
        {showBanner && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent p-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-gold text-primary shadow-gold">
              <Gift className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Refer 5 people to win an instant $1,500!</p>
              <p className="text-xs text-muted-foreground">Share your unique code and earn $300 per registered referral.</p>
            </div>
            <button onClick={() => setReferOpen(true)} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Refer People
            </button>
            <button onClick={() => setShowBanner(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Balance card */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="md:col-span-2 overflow-hidden rounded-2xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Available Balance</p>
                <p className="mt-3 font-display text-5xl font-semibold">
                  ${profile.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-2 text-sm text-white/70">Bonus & referral credits</p>
              </div>
              <Wallet className="h-7 w-7 text-gold" />
            </div>
            <div className="mt-8 flex gap-2">
              <ActionPill icon={<Send className="h-4 w-4" />} label="Withdraw" onClick={() => navigate({ to: "/withdrawal" })} />
              <ActionPill icon={<Plus className="h-4 w-4" />} label="Add" />
              <ActionPill icon={<TrendingUp className="h-4 w-4" />} label="Activity" />
            </div>
          </div>

          <GrantStatusCard tier={profile.tier} status={profile.tier_status} requestedTier={profile.requested_tier} />
        </section>

        {/* Referral widget */}
        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Your Referral Code
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-5 text-center">
              <p className="font-display text-4xl font-semibold tracking-[0.35em] text-primary">{profile.referral_code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code);
                toast.success("Code copied to clipboard");
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background py-2.5 text-sm font-medium hover:bg-accent"
            >
              <Copy className="h-4 w-4" /> Copy Code
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">How it works</p>
            <ul className="mt-4 space-y-3 text-sm">
              <Bullet n={1}>Share your code with friends and family.</Bullet>
              <Bullet n={2}>They get <strong className="text-forest">$200</strong> instantly when they register.</Bullet>
              <Bullet n={3}>You earn <strong className="text-forest">$300</strong> per verified signup.</Bullet>
              <Bullet n={4}>Hit 5 referrals and receive a <strong className="text-gold">$500 bonus</strong>.</Bullet>
            </ul>
          </div>
        </section>
      </main>

      {referOpen && <ReferModal code={profile.referral_code} onClose={() => setReferOpen(false)} />}
    </div>
  );
}

function ActionPill({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15">
      {icon} {label}
    </button>
  );
}

const TIER_INFO: Record<number, { label: string; cap: string }> = {
  1: { label: "Tier 1", cap: "Up to $500" },
  2: { label: "Tier 2", cap: "Up to $15,000" },
  3: { label: "Tier 3", cap: "Unlimited" },
};

function TierUpgradeCard({ tier, status, requestedTier, onUpgrade }: {
  tier: number; status: string; requestedTier: number | null; onUpgrade: () => void;
}) {
  const pending = status === "pending" && requestedTier && requestedTier > tier;
  const isMax = tier >= 3;
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-background to-gold/5 p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-forest text-forest-foreground shadow-elegant">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Upgrade your tier</p>
            {pending && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                Tier {requestedTier} pending
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Currently <strong className="text-forest">{TIER_INFO[tier]?.label}</strong> ({TIER_INFO[tier]?.cap}). Upgrading unlocks higher grant amounts.
          </p>
        </div>
        {!isMax && !pending && (
          <button onClick={onUpgrade} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-forest px-5 py-2.5 text-sm font-semibold text-forest-foreground hover:opacity-95">
            Upgrade <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function GrantStatusCard({ tier, status, requestedTier }: { tier: number; status: string; requestedTier: number | null }) {
  const info = TIER_INFO[tier] ?? TIER_INFO[1];
  const pending = status === "pending" && requestedTier && requestedTier > tier;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Grant Status</p>
        <Award className="h-5 w-5 text-forest" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <p className="font-display text-2xl font-semibold">{info.label}</p>
        {pending && (
          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
            Tier {requestedTier} · Pending
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{info.cap}</p>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-forest" style={{ width: `${(tier / 3) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pending ? "Verification in progress" : tier < 3 ? "Upgrade to unlock more capital" : "Maximum tier reached"}
      </p>
    </div>
  );
}

function Bullet({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest/10 text-xs font-semibold text-forest">{n}</span>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

function ReferModal({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Invite & Earn</p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Your Referral Code</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-xl bg-gradient-primary p-6 text-center text-primary-foreground">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Share this code</p>
          <p className="mt-3 font-display text-5xl font-semibold tracking-[0.3em] text-gold">{code}</p>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Copied! Share it anywhere.");
          }}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary shadow-gold"
        >
          <Copy className="h-4 w-4" /> Copy & Share
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You'll receive $300 the moment your friend completes registration.
        </p>
      </div>
    </div>
  );
}
