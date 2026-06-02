import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Calendar, Check, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Seedin America" },
      { name: "description", content: "Begin your federal grant application in three secure steps." },
    ],
  }),
  component: SignupPage,
});

const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19|20)\d{2}$/;

const step1Schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full legal name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  address: z.string().trim().min(5, "Enter your residential address").max(255),
  date_of_birth: z.string().regex(dobRegex, "Use MM/DD/YYYY (e.g. 04/12/1990)"),
  password: z.string().min(8, "Minimum 8 characters").max(72),
  confirm_password: z.string().min(8, "Confirm your password").max(72),
}).refine((v) => v.password === v.confirm_password, {
  message: "Passwords do not match", path: ["confirm_password"],
});

type Step1 = z.infer<typeof step1Schema>;

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<Step1>({
    full_name: "", email: "", phone: "", address: "", date_of_birth: "", password: "", confirm_password: "",
  });
  const [hearAbout, setHearAbout] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  if (success) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/40 to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        <ProgressBar step={step} />

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border bg-gradient-primary px-8 py-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure Application
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
              {step === 1 && "Personal Details"}
              {step === 2 && "Referral Verification"}
              {step === 3 && "Terms & Conditions"}
            </h1>
            <p className="mt-1 text-sm text-white/75">
              {step === 1 && "Tell us who you are. All information is encrypted end-to-end."}
              {step === 2 && "Let us know how you heard about Seedin America."}
              {step === 3 && "Please review and accept to complete your application."}
            </p>
          </div>

          <div className="p-8">
            {step === 1 && (
              <Step1Form
                value={data}
                onChange={setData}
                onNext={() => {
                  const parsed = step1Schema.safeParse(data);
                  if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
                    return;
                  }
                  setStep(2);
                }}
              />
            )}
            {step === 2 && (
              <Step2Form
                hearAbout={hearAbout}
                setHearAbout={setHearAbout}
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3Terms
                scrolledToEnd={scrolledToEnd}
                setScrolledToEnd={setScrolledToEnd}
                accepted={acceptedTerms}
                setAccepted={setAcceptedTerms}
                onBack={() => setStep(2)}
                submitting={submitting}
                onSubmit={async () => {
                  setSubmitting(true);
                  const { error } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                    options: {
                      emailRedirectTo: `${window.location.origin}/dashboard`,
                      data: {
                        full_name: data.full_name,
                        phone: data.phone,
                        address: data.address,
                        date_of_birth: (() => { const [m,d,y] = data.date_of_birth.split("/"); return `${y}-${m}-${d}`; })(),
                        hear_about: hearAbout,
                        referral_code: referralCode.trim().toUpperCase() || null,
                      },
                    },
                  });
                  setSubmitting(false);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  // Sign out so user must sign in (per success-state spec)
                  await supabase.auth.signOut();
                  setSuccess(true);
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const steps = ["Personal", "Referral", "Terms"];
  return (
    <div className="flex items-center gap-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step >= n;
        const done = step > n;
        return (
          <div key={label} className="flex flex-1 items-center gap-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition ${active ? "bg-gradient-gold text-primary shadow-gold" : "bg-muted text-muted-foreground"}`}>
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <div className="flex-1">
              <div className={`text-xs uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground"}`}>Step {n}</div>
              <div className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</div>
            </div>
            {i < steps.length - 1 && <div className={`h-px flex-1 ${done ? "bg-gold" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        {...props}
        className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
      />
    </label>
  );
}

function formatDob(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

function Step1Form({ value, onChange, onNext }: { value: Step1; onChange: (v: Step1) => void; onNext: () => void }) {
  const set = (k: keyof Step1) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const dobPickerRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-5">
      <Field label="Full Legal Name" placeholder="John A. Smith" value={value.full_name} onChange={set("full_name")} required />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Email Address" type="email" placeholder="you@example.com" value={value.email} onChange={set("email")} required />
        <Field label="Phone Number" type="tel" placeholder="(555) 123-4567" value={value.phone} onChange={set("phone")} required />
      </div>
      <Field label="Residential Address" placeholder="1600 Main St, Springfield, IL 62701" value={value.address} onChange={set("address")} required />

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth</span>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/DD/YYYY"
            value={value.date_of_birth}
            onChange={(e) => onChange({ ...value, date_of_birth: formatDob(e.target.value) })}
            maxLength={10}
            required
            className="block w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          <button
            type="button"
            onClick={() => dobPickerRef.current?.showPicker?.()}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-forest"
            aria-label="Pick date"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <input
            ref={dobPickerRef}
            type="date"
            max={new Date().toISOString().split("T")[0]}
            className="pointer-events-none absolute right-2 top-1/2 h-0 w-0 -translate-y-1/2 opacity-0"
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m, d] = v.split("-");
              onChange({ ...value, date_of_birth: `${m}/${d}/${y}` });
            }}
          />
        </div>
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <PasswordField label="Create Password" value={value.password} onChange={set("password")} show={showPw} setShow={setShowPw} />
        <PasswordField label="Confirm Password" value={value.confirm_password} onChange={set("confirm_password")} show={showCpw} setShow={setShowCpw} />
      </div>

      <button type="submit" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function PasswordField({ label, value, onChange, show, setShow }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean; setShow: (v: boolean) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          minLength={8}
          placeholder="Minimum 8 characters"
          className="block w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-forest" aria-label={show ? "Hide" : "Show"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Step2Form({ hearAbout, setHearAbout, referralCode, setReferralCode, onBack, onNext }: {
  hearAbout: string; setHearAbout: (v: string) => void;
  referralCode: string; setReferralCode: (v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const options = ["Friend or family", "Social media", "News article", "Government outreach", "Other"];
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <div>
        <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How did you hear about us?
        </span>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => setHearAbout(opt)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${hearAbout === opt ? "border-forest bg-forest/10 text-forest" : "border-input bg-background hover:bg-accent"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Referral Code (Optional)
        </span>
        <input
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="e.g. US7X9K"
          maxLength={6}
          className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-lg font-mono uppercase tracking-[0.4em] text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-gold/5 p-5">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-gold" />
          <p className="text-sm leading-relaxed text-foreground">
            <strong className="text-primary">Bonus offer:</strong> Every referred applicant receives an
            instant <span className="font-semibold text-forest">$200 bonus balance</span> upon successful
            registration, and the referrer receives <span className="font-semibold text-forest">$300</span>.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-95">
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

const TERMS = `SEEDIN AMERICA — TERMS AND CONDITIONS OF PARTICIPATION

PREAMBLE
These Terms and Conditions ("Agreement") govern your participation in the Seedin America Federal Grant Initiative ("Program"), operated under endorsement of the Office of the President and administered in accordance with applicable federal regulations.

1. ELIGIBILITY
1.1 You must be at least eighteen (18) years of age and a citizen or lawful permanent resident of the United States of America.
1.2 You must possess a valid federal taxpayer identification number.
1.3 You must intend to use disbursed grant capital exclusively for the establishment, operation, or expansion of a lawful business enterprise.

2. APPLICATION REVIEW
2.1 All applications are reviewed by independent grant adjudicators within fourteen (14) business days.
2.2 The Program reserves the right to request additional documentation including, but not limited to, business plans, financial statements, and identity verification.
2.3 Submission does not guarantee approval.

3. DISBURSEMENT OF FUNDS
3.1 Approved grants are disbursed via ACH transfer to a U.S.-based deposit account in the applicant's name.
3.2 Disbursements are non-dilutive: the Program takes no equity, royalty, or repayment obligation.
3.3 Recipients shall use funds in accordance with the use-of-proceeds statement submitted during application.

4. REFERRAL PROGRAM
4.1 Referred applicants receive an automatic $200 bonus balance credit upon successful registration.
4.2 Referrers receive an automatic $300 credit per verified registration.
4.3 The Program reserves the right to audit, suspend, or revoke referral credits in the event of suspected fraud, self-referral, or other abuse.

5. CONFIDENTIALITY AND DATA SECURITY
5.1 All personal information is processed under bank-grade encryption and retained in accordance with the Federal Information Security Modernization Act (FISMA).
5.2 You authorize the Program to share information with federal agencies as required by law.

6. PROHIBITED CONDUCT
6.1 You shall not submit false, misleading, or fraudulent information.
6.2 You shall not use the Program for any unlawful purpose.
6.3 Violation of this Section 6 may result in immediate termination, forfeiture of funds, and referral to appropriate authorities.

7. LIMITATION OF LIABILITY
7.1 To the maximum extent permitted by law, the Program, its officers, employees, and agents shall not be liable for any indirect, incidental, or consequential damages arising from your participation.
7.2 Your sole remedy in any dispute shall be limited to the value of the grant disbursed.

8. AMENDMENTS
8.1 The Program reserves the right to amend these Terms at any time, with notice provided via the registered email address.
8.2 Continued participation following amendment constitutes acceptance.

9. GOVERNING LAW
9.1 This Agreement shall be governed by the laws of the United States of America and the District of Columbia.
9.2 Any dispute arising hereunder shall be submitted to binding arbitration in Washington, D.C.

10. ACKNOWLEDGMENT
By checking the acceptance box below, you acknowledge that you have read, understood, and agree to be bound by the entirety of this Agreement. You further certify that all information provided in your application is true, accurate, and complete to the best of your knowledge.

— END OF AGREEMENT —`;

function Step3Terms({ scrolledToEnd, setScrolledToEnd, accepted, setAccepted, onBack, onSubmit, submitting }: {
  scrolledToEnd: boolean; setScrolledToEnd: (v: boolean) => void;
  accepted: boolean; setAccepted: (v: boolean) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledToEnd(true);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [setScrolledToEnd]);

  const canSubmit = scrolledToEnd && accepted && !submitting;

  return (
    <div className="space-y-5">
      <div
        ref={ref}
        className="relative h-72 overflow-y-auto rounded-lg border border-input bg-accent/30 p-5 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap"
      >
        {TERMS}
      </div>
      {!scrolledToEnd && (
        <p className="text-center text-xs text-muted-foreground">↓ Scroll to the bottom to continue</p>
      )}

      <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${scrolledToEnd ? "border-input bg-background hover:bg-accent" : "border-dashed border-border bg-muted/30 opacity-60"}`}>
        <input
          type="checkbox"
          disabled={!scrolledToEnd}
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-forest"
        />
        <span className="text-sm">
          I have read and accept the <strong>Terms and Conditions</strong> of Seedin America.
        </span>
      </label>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          disabled={!canSubmit}
          onClick={onSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary shadow-gold transition disabled:cursor-not-allowed disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : "Confirm Signup"}
        </button>
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary via-primary to-forest px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/5 p-10 text-center text-white backdrop-blur-xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-gold shadow-gold">
          <Check className="h-10 w-10 text-primary" strokeWidth={3} />
        </div>
        <h1 className="mt-8 font-display text-4xl font-semibold text-balance">
          Welcome to Seedin America
        </h1>
        <p className="mt-4 text-white/80">
          Your application has been received and your secure account has been created.
          Sign in to access your dashboard and begin your grant application.
        </p>
        <Link
          to="/signin"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-base font-semibold text-primary shadow-gold hover:scale-[1.02]"
        >
          Sign In <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
