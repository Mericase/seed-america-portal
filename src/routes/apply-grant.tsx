import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Loader2, ShieldCheck, Landmark, Gift,
  XCircle, CheckCircle2, Sprout, Scale,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/apply-grant")({
  head: () => ({
    meta: [
      { title: "Apply for Grant — Seedin America" },
      { name: "description", content: "Submit your federal grant application." },
    ],
  }),
  component: ApplyGrantIntro,
});

function ApplyGrantIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<number>(1);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }
      const { data } = await supabase.from("profiles").select("tier, full_name").eq("id", session.user.id).maybeSingle();
      if (!data || (data.tier ?? 1) < 2) {
        toast.error("You must be Tier 2 to apply for a grant.");
        navigate({ to: "/dashboard" });
        return;
      }
      setTier(data.tier);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-forest" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-12">

        {/* Hero badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-forest">
            <Sprout className="h-3.5 w-3.5" /> Tier {tier} Verified — You Are Eligible
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-5 text-center font-display text-4xl font-semibold leading-tight md:text-5xl">
          Before You Apply —<br />
          <span className="text-forest">Please Read This Carefully</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          This takes less than a minute and ensures you fully understand the nature of what you’re applying for.
        </p>

        {/* Main declaration card */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-background to-forest/5 shadow-elegant">
          <div className="flex items-center gap-3 border-b border-gold/20 bg-gradient-to-r from-gold/20 to-transparent px-6 py-4">
            <Scale className="h-5 w-5 text-gold-foreground" />
            <h2 className="font-display text-xl font-semibold">Official Grant Declaration</h2>
          </div>
          <div className="space-y-5 px-6 py-6 text-sm leading-relaxed text-foreground/90">
            <p>
              Seedin America administers federally authorized grant programs under the American Growth Mandate, a public-private initiative designed to accelerate economic mobility, reduce household debt, and expand access to capital for everyday Americans. The funds disbursed through this program are <strong className="text-foreground">grants — not loans</strong>.
            </p>
            <p>
              A grant is a direct financial award made to an eligible individual or household with <strong className="text-foreground">no obligation of repayment, no interest, no equity transfer, and no conditions attached to the money once disbursed</strong>. You will never be asked to pay this money back — not in part, not in full, not under any circumstance. Seedin America does not take a percentage of your award, does not charge processing fees from the disbursement, and holds no financial claim over any asset you may acquire using the funds.
            </p>
            <p>
              This is categorically different from a personal loan, a payday advance, a business line of credit, or any form of debt instrument. There is no creditor. There is no repayment schedule. There is no penalty for how you choose to use the funds within the stated purpose of your application. <strong className="text-foreground">Once the money is in your account, it is entirely and permanently yours.</strong>
            </p>
            <p>
              Federal grant funds are sourced from designated Treasury allocations and are disbursed directly into the bank account you provide during this application. Disbursement typically occurs within 14 business days of approval. The review process considers household income, tier standing, urgency, and the purpose of your request.
            </p>
            <p className="rounded-lg border border-forest/30 bg-forest/5 p-4">
              <strong className="text-forest">Important notice:</strong> Submitting false or misleading information in a federal grant application is a criminal offense under 18 U.S.C. § 1001 and may result in disqualification, demand for return of funds, civil liability, or federal prosecution. All information you provide is verified against IRS and federal agency records.
            </p>
          </div>
        </div>

        {/* Grant vs Loan comparison */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-forest/30 bg-forest/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-forest text-forest-foreground">
                <Gift className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-forest">This is a Grant</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "Zero repayment — ever",
                "No interest charged",
                "No collateral required",
                "No equity given up",
                "No monthly payments",
                "Yours permanently upon disbursement",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive">
                <XCircle className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-destructive">Not a Loan</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "No repayment schedule",
                "No interest or APR",
                "No credit check required",
                "No debt added to your record",
                "No creditor or lender relationship",
                "No penalties for usage",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-forest" /> Bank-grade encryption
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Landmark className="h-4 w-4 text-forest" /> U.S. Treasury backed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-forest" /> Decision in 14 business days
          </span>
        </div>

        {/* Acknowledgement + CTA */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-forest"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-sm text-foreground/90">
              I have read and understood the grant declaration above. I confirm that I understand this is a <strong>grant and not a loan</strong>, that no repayment will ever be required, and that I am applying with truthful and accurate information.
            </span>
          </label>

          <button
            disabled={!agreed}
            onClick={() => navigate({ to: "/apply-grant-form" })}
            className="group mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-gold px-7 py-4 text-base font-semibold text-primary shadow-gold transition hover:translate-y-[-2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            I Understand — Proceed to Application
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </button>
          {!agreed && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Please check the box above to continue.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
