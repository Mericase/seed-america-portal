import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Lock, Loader2, AlertCircle, CheckCircle2, Send, Wallet,
  Landmark as Bank, ChevronRight, ArrowUpRight
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth";

export const Route = createFileRoute("/withdrawal")({
  head: () => ({ meta: [{ title: "Withdrawal — Seedin America" }] }),
  component: Withdrawal,
});

type Step = 'check' | 'upgrade-required' | 'withdraw' | 'confirmation';

function Withdrawal() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('check');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/signin" });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile | null);
        // Check tier
        if (data.tier === 3 && data.tier_status === 'active') {
          setStep('withdraw');
        } else {
          setStep('upgrade-required');
        }
      }
      setLoading(false);
    };

    load();
  }, [navigate]);

  const calculateWithdrawal = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const fee = numAmount * 0.15;
    const netAmount = numAmount - fee;
    return { fee, netAmount, numAmount };
  };

  const handleWithdrawSubmit = async () => {
    if (!profile) return;

    const numAmount = parseFloat(withdrawAmount) || 0;

    if (!withdrawAmount) {
      toast.error("Please enter a withdrawal amount");
      return;
    }

    if (numAmount > profile.balance) {
      toast.error("Amount exceeds available balance");
      return;
    }

    if (numAmount < 100) {
      toast.error("Minimum withdrawal is $100");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          pending_withdrawal: numAmount,
          withdrawal_submitted_at: new Date().toISOString(),
          withdrawal_status: "pending_admin_approval",
        } as any)
        .eq("id", profile.id);

      if (error) throw error;
      setStep('confirmation');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="text-muted-foreground">Unable to load your account. Please try again.</p>
        </div>
      </div>
    );
  }

  // UPGRADE REQUIRED STEP
  if (step === 'upgrade-required') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-12 text-primary-foreground text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
                <Lock className="h-8 w-8 text-gold" />
              </div>
              <h1 className="font-display text-3xl font-semibold">Upgrade to Tier 3</h1>
              <p className="mt-3 text-white/80 max-w-lg mx-auto">
                Withdrawals are exclusive to Tier 3 members. Upgrade now to unlock unlimited grant applications and withdraw your funds.
              </p>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-border bg-accent/50 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">Your Current Tier</p>
                  <p className="text-2xl font-semibold text-foreground mb-4">Tier {profile.tier}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.tier === 1 && 'Grant applications up to $500'}
                    {profile.tier === 2 && 'Grant applications up to $15,000'}
                  </p>
                </div>

                <div className="rounded-lg border border-gold/40 bg-gold/10 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mb-2">Tier 3 Benefits</p>
                  <p className="text-2xl font-semibold text-foreground mb-4">Unlimited</p>
                  <p className="text-sm text-muted-foreground">
                    Unlimited grant applications with full withdrawal access
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                <div className="flex gap-4">
                  <AlertCircle className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">What's Required?</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      To upgrade to Tier 3 and enable withdrawals, you'll need to:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-forest font-bold">1</span>
                        <span>Link your bank account securely</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-forest font-bold">2</span>
                        <span>Verify your identity with bank-level authentication</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-forest font-bold">3</span>
                        <span>Wait for admin approval (usually 24 hours)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate({ to: "/update-tier-3" })}
                className="w-full py-4 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Upgrade to Tier 3
                <ChevronRight className="h-4 w-4" />
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Your upgrade request will be reviewed within 24 hours. You'll receive an email confirmation once approved.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // WITHDRAWAL STEP
  if (step === 'withdraw') {
    const { fee, netAmount, numAmount } = calculateWithdrawal(withdrawAmount);
    const isExceeded = numAmount > profile.balance && numAmount > 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Logo />
            <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 pt-10">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold mb-3">
                <Wallet className="h-3.5 w-3.5" /> Withdraw Funds
              </div>
              <h1 className="font-display text-2xl font-semibold md:text-3xl">Request a Withdrawal</h1>
              <p className="mt-1 text-sm text-white/80">
                Withdraw your available balance. Funds will be sent after admin approval.
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* Balance cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-forest font-semibold mb-2">Available Balance</p>
                  <p className="font-display text-3xl font-semibold text-forest">
                    ${profile.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-lg border border-gold/40 bg-gold/10 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mb-2">You'll Receive</p>
                  <p className={`font-display text-3xl font-semibold ${numAmount > 0 ? 'text-gold' : 'text-muted-foreground'}`}>
                    ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground font-semibold">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-4 border-2 rounded-lg text-lg font-semibold focus:outline-none transition ${
                      isExceeded
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border focus:border-forest focus:ring-2 focus:ring-forest/20'
                    }`}
                  />
                </div>
                {isExceeded && (
                  <p className="mt-2 text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Amount exceeds available balance
                  </p>
                )}
              </div>

              {/* Breakdown */}
              {numAmount > 0 && (
                <div className="rounded-lg border border-border bg-accent/50 p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Withdrawal Amount</span>
                    <span className="font-semibold text-foreground">
                      ${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Processing Fee (15%)</span>
                    <span className="font-semibold text-destructive">
                      -${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between items-center bg-gradient-forest/10 rounded p-3">
                    <span className="font-semibold text-foreground">Net Amount</span>
                    <span className="font-display text-xl font-semibold text-gold">
                      ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Linked account */}
              {(profile as any).linked_bank_name && (
                <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                  <div className="flex items-start gap-4">
                    <Bank className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-forest font-semibold mb-1">Withdrawal Account</p>
                      <p className="font-semibold text-foreground">{(profile as any).linked_bank_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">This is your verified withdrawal account</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                disabled={!withdrawAmount || isExceeded || submitting}
                onClick={handleWithdrawSubmit}
                className="w-full py-4 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Request Withdrawal
                  </>
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                After submission, an admin will review your request. Funds typically transfer within 24-72 hours.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // CONFIRMATION STEP
  if (step === 'confirmation') {
    const { fee, netAmount } = calculateWithdrawal(withdrawAmount);

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-forest px-8 py-12 text-forest-foreground text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6 animate-bounce">
                <CheckCircle2 className="h-8 w-8 text-gold" />
              </div>
              <h1 className="font-display text-3xl font-semibold">Withdrawal Requested!</h1>
              <p className="mt-2 text-white/80">Your request has been submitted for admin review</p>
            </div>

            <div className="p-8 space-y-8">
              {/* Summary */}
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6 space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-forest font-semibold">Withdrawal Summary</p>
                <div className="flex justify-between items-center py-3 border-b border-forest/20">
                  <span className="text-muted-foreground text-sm">Amount Requested</span>
                  <span className="font-semibold text-foreground">
                    ${parseFloat(withdrawAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-forest/20">
                  <span className="text-muted-foreground text-sm">Processing Fee</span>
                  <span className="font-semibold text-destructive">
                    -${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-foreground font-semibold">Net Transfer</span>
                  <span className="font-display text-xl font-semibold text-gold">
                    ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-6">
                <p className="font-semibold text-foreground mb-4">⏳ What Happens Next?</p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">1</span>
                    <span>Admin reviews your withdrawal request</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">2</span>
                    <span>Approval typically takes 24-72 hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">3</span>
                    <span>Funds transfer to your linked bank account</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">4</span>
                    <span>You'll receive email confirmation</span>
                  </li>
                </ol>
              </div>

              {/* Note */}
              <div className="rounded-lg border border-border bg-accent/50 p-4 text-xs text-muted-foreground">
                <p><strong>Note:</strong> Additional verification may be requested, which could extend processing time. You'll be notified via email if we need more information.</p>
              </div>

              {/* Return button */}
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full py-4 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default Withdrawal;
