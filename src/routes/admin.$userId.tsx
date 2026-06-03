import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Ban, CheckCircle2, Loader2, Mail, MapPin, Phone, ShieldAlert,
  Trash2, UserCheck, ChevronDown, ChevronUp, ExternalLink, RotateCcw, Crown,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  amIAdmin, getUserDetail, approveTierUpgrade, rejectTierUpgrade, setUserTier,
  updateBalance, terminateUser, restoreUser, deleteUser, updateApplicationStatus,
  grantAdminRole, revokeAdminRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/$userId")({
  head: () => ({ meta: [{ title: "Member Detail — Seedin America Admin" }] }),
  component: AdminUserDetail,
});

type Detail = Awaited<ReturnType<typeof getUserDetail>>;

function AdminUserDetail() {
  const navigate = useNavigate();
  const { userId } = useParams({ from: "/admin/$userId" });
  const checkAdmin = useServerFn(amIAdmin);
  const fetchDetail = useServerFn(getUserDetail);
  const approveFn = useServerFn(approveTierUpgrade);
  const rejectFn = useServerFn(rejectTierUpgrade);
  const terminateFn = useServerFn(terminateUser);
  const restoreFn = useServerFn(restoreUser);
  const deleteFn = useServerFn(deleteUser);
  const grantAdminFn = useServerFn(grantAdminRole);
  const revokeAdminFn = useServerFn(revokeAdminRole);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchDetail({ data: { userId } });
      setDetail(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load user");
      navigate({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate({ to: "/signin" });
          return;
        }

        const staffAuth = typeof window !== "undefined" && sessionStorage.getItem("staff_admin_auth") === "true";

        if (!staffAuth) {
          const res = await checkAdmin();
          if (!res.admin) {
            navigate({ to: "/dashboard" });
            return;
          }
        }

        await load();
      } catch {
        navigate({ to: "/dashboard" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const wrap = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-forest" />
      </div>
    );
  }

  const p = detail.profile as Record<string, unknown> & {
    id: string; full_name: string; email: string; phone: string; address: string;
    date_of_birth: string; balance: number; tier: number; tier_status: string;
    requested_tier: number | null; profile_status: string; created_at: string;
    referral_code: string; referred_by: string | null; hear_about: string | null;
    ssn_last4: string | null; verification_submitted_at: string | null;
  };

  const pending = p.tier_status === "pending" && p.requested_tier && p.requested_tier > p.tier;
  const isAdmin = detail.roles.includes("admin");

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldAlert className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Admin
            </span>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> All Members
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-10">

        {/* Header card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold">Member Profile</p>
              <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">{p.full_name}</h1>
              <p className="mt-2 text-sm text-white/80">{p.email} · {p.phone}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Pill>Tier {p.tier}</Pill>
                {pending && <Pill tone="gold">→ Tier {p.requested_tier} pending</Pill>}
                <Pill tone={p.profile_status === "terminated" ? "danger" : "forest"}>{p.profile_status}</Pill>
                {isAdmin && <Pill tone="gold"><Crown className="mr-1 inline h-3 w-3" />Admin</Pill>}
                <Pill>Code: {p.referral_code}</Pill>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">Balance</p>
              <p className="mt-1 font-display text-4xl font-semibold">
                ${Number(p.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Admin actions */}
        <section className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {pending ? (
            <>
              <ActionBtn
                onClick={() => wrap(() => approveFn({ data: { userId } }), `Tier upgraded to ${p.requested_tier}`)}
                disabled={busy}
                tone="forest"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                Approve Tier {p.requested_tier}
              </ActionBtn>
              <ActionBtn
                onClick={() => wrap(() => rejectFn({ data: { userId } }), "Tier request rejected")}
                disabled={busy}
                tone="danger"
                icon={<Ban className="h-4 w-4" />}
              >
                Reject Upgrade
              </ActionBtn>
            </>
          ) : (
            <TierSelector currentTier={p.tier} userId={userId} onDone={load} busy={busy} setBusy={setBusy} />
          )}
          <BalanceEditor balance={Number(p.balance)} userId={userId} onDone={load} busy={busy} setBusy={setBusy} />
          {p.profile_status === "terminated" ? (
            <ActionBtn
              onClick={() => wrap(() => restoreFn({ data: { userId } }), "User restored")}
              disabled={busy}
              tone="forest"
              icon={<RotateCcw className="h-4 w-4" />}
            >
              Restore Access
            </ActionBtn>
          ) : (
            <ActionBtn
              onClick={() => {
                if (!confirm("Terminate this user? They will be signed out and lose access.")) return;
                wrap(() => terminateFn({ data: { userId } }), "User terminated");
              }}
              disabled={busy}
              tone="danger"
              icon={<Ban className="h-4 w-4" />}
            >
              Terminate User
            </ActionBtn>
          )}
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin ? (
            <ActionBtn
              onClick={() => wrap(() => revokeAdminFn({ data: { userId } }), "Admin role revoked")}
              disabled={busy}
              tone="danger"
              icon={<UserCheck className="h-4 w-4" />}
            >
              Revoke Admin
            </ActionBtn>
          ) : (
            <ActionBtn
              onClick={() => wrap(() => grantAdminFn({ data: { userId } }), "Admin role granted")}
              disabled={busy}
              tone="gold"
              icon={<Crown className="h-4 w-4" />}
            >
              Promote to Admin
            </ActionBtn>
          )}
          <ActionBtn
            onClick={() => {
              if (!confirm("Permanently delete this user and all their data? This cannot be undone.")) return;
              wrap(async () => {
                await deleteFn({ data: { userId } });
                navigate({ to: "/admin" });
              }, "User deleted");
            }}
            disabled={busy}
            tone="danger"
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete Permanently
          </ActionBtn>
        </section>

        {/* Sign-up Information — everything they filled out */}
        <Panel title="Sign-up Information" defaultOpen>
          <Grid>
            <Info label="Full Name" value={s(p.full_name)} />
            <Info label="Email" value={s(p.email)} icon={<Mail className="h-3.5 w-3.5" />} />
            <Info label="Phone" value={s(p.phone)} icon={<Phone className="h-3.5 w-3.5" />} />
            <Info label="Date of Birth" value={p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "—"} />
            <Info label="Address" value={s(p.address)} icon={<MapPin className="h-3.5 w-3.5" />} />
            <Info label="How they heard about us" value={s(p.hear_about)} />
            <Info label="Referral Code (theirs)" value={s(p.referral_code)} />
            <Info
              label="Referred By"
              value={
                detail.referrer
                  ? `${detail.referrer.full_name} (${detail.referrer.referral_code})`
                  : "—"
              }
            />
            <Info label="Referrals Made" value={String(detail.referralCount)} />
            <Info label="Account Tier" value={`Tier ${p.tier}`} />
            <Info label="Tier Status" value={s(p.tier_status)} />
            <Info label="Account Balance" value={`$${Number(p.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            <Info label="Profile Status" value={s(p.profile_status)} />
            <Info label="Joined" value={p.created_at ? new Date(p.created_at).toLocaleString() : "—"} />
          </Grid>
        </Panel>

        {/* Tier 2 Verification Documents */}
        <Panel title="Tier 2 Verification Documents" defaultOpen={!!pending}>
          {!p.verification_submitted_at ? (
            <p className="text-sm text-muted-foreground">No tier upgrade has been requested yet.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="SSN (last 4)" value={p.ssn_last4 ? `•••-••-${p.ssn_last4}` : "—"} />
                <Info label="Submitted At" value={new Date(p.verification_submitted_at).toLocaleString()} />
                <Info label="Requested Tier" value={p.requested_tier ? `Tier ${p.requested_tier}` : "—"} />
                <Info label="Verification Status" value={s(p.tier_status)} />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DocImage label="ID Front" url={detail.signedUrls.id_front_url} />
                <DocImage label="ID Back" url={detail.signedUrls.id_back_url} />
                <DocImage label="SSN Card" url={detail.signedUrls.ssn_card_url} />
                <DocImage label="Selfie with ID" url={detail.signedUrls.selfie_url} />
              </div>
            </>
          )}
        </Panel>

        {/* Grant Applications */}
        <Panel
          title={`Grant Applications (${detail.applications.length})`}
          defaultOpen={detail.applications.length > 0}
        >
          {detail.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">This member has not submitted any grant applications.</p>
          ) : (
            <div className="space-y-6">
              {detail.applications.map((app) => (
                <ApplicationCard key={app.id} app={app} onRefresh={load} />
              ))}
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
}

function ApplicationCard({
  app,
  onRefresh,
}: {
  app: Record<string, unknown> & { id: string; status: string; created_at: string };
  onRefresh: () => Promise<void>;
}) {
  const update = useServerFn(updateApplicationStatus);
  const [notes, setNotes] = useState((app.admin_notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const setStatus = async (status: "pending" | "approved" | "rejected" | "disbursed") => {
    setSaving(true);
    try {
      await update({ data: { applicationId: app.id, status, notes } });
      toast.success(`Application marked as ${status}`);
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{(app.grant_type as string) || "Grant Application"}</h3>
            <Pill
              tone={
                app.status === "approved" ? "forest"
                : app.status === "rejected" ? "danger"
                : app.status === "disbursed" ? "gold"
                : "muted"
              }
            >
              {String(app.status)}
            </Pill>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(app.created_at).toLocaleString()}
          </p>
        </div>
        <p className="font-display text-2xl font-semibold text-forest">
          ${Number(app.amount_requested ?? 0).toLocaleString("en-US")}
        </p>
      </div>

      <AppSection title="Household & Personal">
        <Grid>
          <Info label="Marital Status" value={s(app.marital_status)} />
          <Info label="Dependents" value={s(app.dependents)} />
          <Info label="Household Size" value={s(app.household_size)} />
          <Info label="Education" value={s(app.education)} />
          <Info label="Ethnicity" value={s(app.ethnicity)} />
          <Info label="Housing Status" value={s(app.housing_status)} />
          <Info label="Veteran" value={s(app.veteran)} />
          <Info label="Disability" value={s(app.disability)} />
          <Info label="State" value={s(app.state)} />
          <Info label="City" value={s(app.city)} />
          <Info label="ZIP Code" value={s(app.zip)} />
        </Grid>
      </AppSection>

      <AppSection title="Employment & Financial">
        <Grid>
          <Info label="Employment Status" value={s(app.employment_status)} />
          <Info label="Employer" value={s(app.employer)} />
          <Info label="Occupation" value={s(app.occupation)} />
          <Info
            label="Household Income"
            value={`$${Number(app.household_income ?? 0).toLocaleString()} ${s(app.income_frequency)}`}
          />
          <Info label="Monthly Expenses" value={`$${Number(app.monthly_expenses ?? 0).toLocaleString()}`} />
          <Info label="Received Gov Aid Before" value={s(app.received_gov_aid_before)} />
          <Info label="Public Record (Bankruptcy/Liens)" value={s(app.has_public_record)} />
        </Grid>
        {app.received_gov_aid_details ? (
          <Info label="Previous Aid Details" value={s(app.received_gov_aid_details)} block />
        ) : null}
      </AppSection>

      <AppSection title="Grant Request">
        <Grid>
          <Info
            label="Grant Type"
            value={`${s(app.grant_type)}${app.grant_type_other ? ` — ${s(app.grant_type_other)}` : ""}`}
          />
          <Info label="Urgency" value={s(app.urgency)} />
          <Info label="Amount Requested" value={`$${Number(app.amount_requested ?? 0).toLocaleString()}`} />
        </Grid>
        <Info label="Purpose / Description" value={s(app.purpose_description)} block />
      </AppSection>

      <AppSection title="Disbursement Bank Details">
        <Grid>
          <Info label="Bank Name" value={s(app.bank_name)} />
          <Info label="Account Holder Name" value={s(app.account_holder_name)} />
          <Info label="Account Type" value={s(app.account_type)} />
          <Info label="Routing Number" value={s(app.routing_number)} />
          <Info label="Account Number" value={s(app.account_number)} />
        </Grid>
      </AppSection>

      {/* Admin controls */}
      <div className="mt-5 rounded-lg border border-input bg-accent/30 p-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-forest/20"
          placeholder="Internal notes — visible to admins only"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={saving}
            onClick={() => setStatus("approved")}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-forest-foreground disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            disabled={saving}
            onClick={() => setStatus("disbursed")}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary shadow-gold disabled:opacity-50"
          >
            Mark Disbursed
          </button>
          <button
            disabled={saving}
            onClick={() => setStatus("rejected")}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> Reject
          </button>
          <button
            disabled={saving}
            onClick={() => setStatus("pending")}
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Reset to Pending
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */

function s(v: unknown) {
  return v == null || v === "" ? "—" : String(v);
}

function Panel({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-display text-xl font-semibold">{title}</span>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {open && <div className="border-t border-border p-6">{children}</div>}
    </section>
  );
}

function AppSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest">{title}</p>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Info({
  label,
  value,
  icon,
  block,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  block?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-accent/30 p-3 ${block ? "sm:col-span-2 lg:col-span-3 mt-3" : ""}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "gold" | "forest" | "danger";
}) {
  const cls =
    tone === "gold" ? "bg-gold/20 text-gold-foreground"
    : tone === "forest" ? "bg-forest/20 text-forest"
    : tone === "danger" ? "bg-destructive/20 text-destructive"
    : "bg-white/15 text-white";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone = "default",
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "forest" | "gold" | "danger";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "forest" ? "bg-gradient-forest text-forest-foreground"
    : tone === "gold" ? "bg-gradient-gold text-primary shadow-gold"
    : tone === "danger" ? "bg-destructive text-destructive-foreground"
    : "border border-input bg-background text-foreground hover:bg-accent";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${cls}`}
    >
      {icon}{children}
    </button>
  );
}

function DocImage({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="aspect-[4/3] bg-muted">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
            <img src={url} alt={label} className="h-full w-full object-cover transition hover:opacity-90" />
          </a>
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            Not uploaded
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold">{label}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:underline">
            <ExternalLink className="inline h-3 w-3" /> Open
          </a>
        )}
      </div>
    </div>
  );
}

function TierSelector({
  currentTier,
  userId,
  onDone,
  busy,
  setBusy,
}: {
  currentTier: number;
  userId: string;
  onDone: () => Promise<void>;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const setTier = useServerFn(setUserTier);
  const [t, setT] = useState(currentTier);
  return (
    <div className="rounded-xl border border-input bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Set Tier Manually</p>
      <div className="mt-2 flex gap-2">
        <select
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value={1}>Tier 1</option>
          <option value={2}>Tier 2</option>
          <option value={3}>Tier 3</option>
        </select>
        <button
          disabled={busy || t === currentTier}
          onClick={async () => {
            setBusy(true);
            try {
              await setTier({ data: { userId, tier: t } });
              toast.success(`Tier set to ${t}`);
              await onDone();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-forest px-3 py-1.5 text-xs font-semibold text-forest-foreground disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function BalanceEditor({
  balance,
  userId,
  onDone,
  busy,
  setBusy,
}: {
  balance: number;
  userId: string;
  onDone: () => Promise<void>;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const update = useServerFn(updateBalance);
  const [val, setVal] = useState(balance.toFixed(2));

  return (
    <div className="rounded-xl border border-input bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjust Balance</p>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm"
          />
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            const n = Number(val);
            if (Number.isNaN(n) || n < 0) { toast.error("Invalid balance"); return; }
            setBusy(true);
            try {
              await update({ data: { userId, balance: n } });
              toast.success("Balance updated");
              await onDone();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
