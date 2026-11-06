import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sprout, ShieldCheck, Landmark, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportMemberEvent } from "@/lib/admin-bot.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/apply-grant-form")({
  head: () => ({
    meta: [
      { title: "Grant Application — Seedin" },
      { name: "description", content: "Submit your Seedin grant application." },
    ],
  }),
  component: ApplyGrant,
});

// Grant types kept in English as they are stored in the database as-is
const GRANT_TYPES = [
  "Business Capital Investment",
  "Mortgage Relief / Home Purchase",
  "Debt Repayment (Credit Card / Medical / Personal)",
  "Student Loan Repayment",
  "Rent Assistance",
  "Utility & Energy Bills",
  "Childcare & Family Support",
  "Medical & Healthcare Expenses",
  "Disability & Accident Recovery",
  "Senior Citizen Support",
  "Veteran Support",
  "Agricultural / Farming Grant",
  "Education & Training",
  "Disaster Recovery",
  "Vehicle Purchase / Transportation",
  "Funeral & Bereavement",
  "Other",
];

function ApplyGrant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState<number>(1);

  const EMPLOYMENT = [t('applyGrantForm.empFullTime'), t('applyGrantForm.empPartTime'), t('applyGrantForm.empSelf'), t('applyGrantForm.empUnemployed'), t('applyGrantForm.empRetired'), t('applyGrantForm.empStudent'), t('applyGrantForm.empDisabled')];
  const MARITAL = [t('applyGrantForm.maritalSingle'), t('applyGrantForm.maritalMarried'), t('applyGrantForm.maritalDivorced'), t('applyGrantForm.maritalWidowed'), t('applyGrantForm.maritalDomestic')];
  const HOUSING = [t('applyGrantForm.houseOwn'), t('applyGrantForm.houseRent'), t('applyGrantForm.houseMortgaged'), t('applyGrantForm.houseFam'), t('applyGrantForm.houseHomeless')];
  const EDUCATION = ["Less than High School", "High School / GED", "Some College", "Associate Degree", "Bachelor's Degree", "Master's Degree", "Doctorate"];
  const ETHNICITY = ["American Indian / Alaska Native", "Asian", "Black / African American", "Hispanic / Latino", "Native Hawaiian / Pacific Islander", "White", "Two or more races", "Prefer not to say"];
  const URGENCY = [t('applyGrantForm.urgency7'), t('applyGrantForm.urgency30'), t('applyGrantForm.urgency90'), t('applyGrantForm.urgencyNone')];

  const [form, setForm] = useState({
    maritalStatus: "", dependents: "", householdSize: "", householdIncome: "",
    incomeFrequency: "Annual", employmentStatus: "", employer: "", occupation: "",
    monthlyExpenses: "", education: "", ethnicity: "", veteran: "", disability: "",
    housingStatus: "", state: "", city: "", zip: "",
    grantType: "", grantTypeOther: "", amountRequested: "", urgency: "",
    purposeDescription: "", receivedGovAidBefore: "", receivedGovAidDetails: "",
    hasPublicRecord: "",
    bankName: "", accountHolderName: "", accountType: "Checking",
    accountNumber: "", confirmAccountNumber: "", routingNumber: "",
    certifyTrue: false, consentVerify: false,
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }
      const { data } = await supabase.from("profiles").select("tier, full_name").eq("id", session.user.id).maybeSingle();
      if (!data || (data.tier ?? 1) < 2) {
        toast.error(t('applyGrant.mustBeTier2'));
        navigate({ to: "/dashboard" });
        return;
      }
      setTier(data.tier);
      setLoading(false);
    })();
  }, [navigate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.grantType === "Other" && !form.grantTypeOther.trim()) return toast.error(t('applyGrantForm.specifyGrant'));
    if (form.accountNumber !== form.confirmAccountNumber) return toast.error(t('applyGrantForm.accountMismatch'));
    if (!/^\d{9}$/.test(form.routingNumber)) return toast.error(t('applyGrantForm.routingDigits'));
    if (!form.certifyTrue || !form.consentVerify) return toast.error(t('applyGrantForm.agreeCertifications'));
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }
      const { error } = await supabase.from("grant_applications").insert({
        user_id: session.user.id, status: "pending",
        marital_status: form.maritalStatus,
        dependents: form.dependents ? parseInt(form.dependents) : null,
        household_size: form.householdSize ? parseInt(form.householdSize) : null,
        education: form.education, ethnicity: form.ethnicity,
        housing_status: form.housingStatus, veteran: form.veteran,
        disability: form.disability, state: form.state, city: form.city, zip: form.zip,
        employment_status: form.employmentStatus, employer: form.employer,
        occupation: form.occupation,
        household_income: form.householdIncome ? Number(form.householdIncome) : null,
        income_frequency: form.incomeFrequency,
        monthly_expenses: form.monthlyExpenses ? Number(form.monthlyExpenses) : null,
        received_gov_aid_before: form.receivedGovAidBefore,
        received_gov_aid_details: form.receivedGovAidDetails,
        has_public_record: form.hasPublicRecord,
        grant_type: form.grantType, grant_type_other: form.grantTypeOther,
        amount_requested: form.amountRequested ? Number(form.amountRequested) : null,
        urgency: form.urgency, purpose_description: form.purposeDescription,
        bank_name: form.bankName, account_holder_name: form.accountHolderName,
        account_type: form.accountType, account_number: form.accountNumber,
        routing_number: form.routingNumber,
      });
      if (error) throw error;
      reportMemberEvent({
        data: {
          kind: "grant_application",
          amount: form.amountRequested ? Number(form.amountRequested) : null,
          detail: form.grantType === "Other" ? form.grantTypeOther : form.grantType,
        },
      }).catch(() => null);
      toast.success(t('applyGrantForm.submitted'), { description: t('applyGrantForm.submittedDesc') });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('applyGrantForm.submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={() => navigate({ to: "/apply-grant" })} className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> {t('applyGrantForm.backBtn')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-forest">
          <Sprout className="h-4 w-4" /> {t('applyGrantForm.tierVerified', { tier })}
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">{t('applyGrantForm.pageTitle')}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {t('applyGrantForm.pageDesc')}
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-10">
          <Section n={1} title={t('applyGrantForm.sec1Title')} desc={t('applyGrantForm.sec1Desc')}>
            <Grid>
              <Select label={t('applyGrantForm.maritalStatus')} value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL} required />
              <Field label={t('applyGrantForm.dependents')} type="number" min={0} value={form.dependents} onChange={(v) => set("dependents", v)} required />
              <Field label={t('applyGrantForm.householdSize')} type="number" min={1} value={form.householdSize} onChange={(v) => set("householdSize", v)} required />
              <Select label={t('applyGrantForm.education')} value={form.education} onChange={(v) => set("education", v)} options={EDUCATION} required />
              <Select label={t('applyGrantForm.ethnicity')} value={form.ethnicity} onChange={(v) => set("ethnicity", v)} options={ETHNICITY} required />
              <Select label={t('applyGrantForm.housingStatus')} value={form.housingStatus} onChange={(v) => set("housingStatus", v)} options={HOUSING} required />
              <Select label={t('applyGrantForm.veteran')} value={form.veteran} onChange={(v) => set("veteran", v)} options={["No", "Yes — Active", "Yes — Reserve / Guard", "Yes — Honorably Discharged"]} required />
              <Select label={t('applyGrantForm.disability')} value={form.disability} onChange={(v) => set("disability", v)} options={["No", "Yes — Physical", "Yes — Mental Health", "Yes — Both", "Prefer not to say"]} required />
              <Field label={t('applyGrantForm.state')} value={form.state} onChange={(v) => set("state", v)} required />
              <Field label={t('applyGrantForm.city')} value={form.city} onChange={(v) => set("city", v)} required />
              <Field label={t('applyGrantForm.zip')} value={form.zip} onChange={(v) => set("zip", v)} required maxLength={10} />
            </Grid>
          </Section>

          <Section n={2} title={t('applyGrantForm.sec2Title')} desc={t('applyGrantForm.sec2Desc')}>
            <Grid>
              <Select label={t('applyGrantForm.employmentStatus')} value={form.employmentStatus} onChange={(v) => set("employmentStatus", v)} options={EMPLOYMENT} required />
              <Field label={t('applyGrantForm.employer')} value={form.employer} onChange={(v) => set("employer", v)} />
              <Field label={t('applyGrantForm.occupation')} value={form.occupation} onChange={(v) => set("occupation", v)} />
              <Field label={t('applyGrantForm.householdIncome')} type="number" min={0} value={form.householdIncome} onChange={(v) => set("householdIncome", v)} required prefix="$" />
              <Select label={t('applyGrantForm.incomeFrequency')} value={form.incomeFrequency} onChange={(v) => set("incomeFrequency", v)} options={[t('applyGrantForm.incFreqAnnual'), t('applyGrantForm.incFreqMonthly'), t('applyGrantForm.incFreqWeekly')]} required />
              <Field label={t('applyGrantForm.monthlyExpenses')} type="number" min={0} value={form.monthlyExpenses} onChange={(v) => set("monthlyExpenses", v)} required prefix="$" />
              <Select label={t('applyGrantForm.receivedGovAid')} value={form.receivedGovAidBefore} onChange={(v) => set("receivedGovAidBefore", v)} options={["No", "Yes"]} required />
              <Select label={t('applyGrantForm.bankruptcies')} value={form.hasPublicRecord} onChange={(v) => set("hasPublicRecord", v)} options={["No", "Yes"]} required />
            </Grid>
            {form.receivedGovAidBefore === "Yes" && (
              <Textarea label={t('applyGrantForm.prevAidDesc')} value={form.receivedGovAidDetails} onChange={(v) => set("receivedGovAidDetails", v)} required />
            )}
          </Section>

          <Section n={3} title={t('applyGrantForm.sec3Title')} desc={t('applyGrantForm.sec3Desc')}>
            <Grid>
              <Select label={t('applyGrantForm.grantType')} value={form.grantType} onChange={(v) => set("grantType", v)} options={GRANT_TYPES} required />
              <Select label={t('applyGrantForm.urgency')} value={form.urgency} onChange={(v) => set("urgency", v)} options={URGENCY} required />
              <Field label={t('applyGrantForm.amountRequested')} type="number" min={1} value={form.amountRequested} onChange={(v) => set("amountRequested", v)} required prefix="$" />
            </Grid>
            {form.grantType === "Other" && (
              <Field label={t('applyGrantForm.specifyGrantLabel')} value={form.grantTypeOther} onChange={(v) => set("grantTypeOther", v)} required />
            )}
            <Textarea label={t('applyGrantForm.purposeDescription')} value={form.purposeDescription} onChange={(v) => set("purposeDescription", v)} required minLength={100} rows={5} />
          </Section>

          <Section n={4} title={t('applyGrantForm.sec4Title')} desc={t('applyGrantForm.sec4Desc')} highlight>
            <Grid>
              <Field label={t('applyGrantForm.bankName')} value={form.bankName} onChange={(v) => set("bankName", v)} required />
              <Field label={t('applyGrantForm.accountHolder')} value={form.accountHolderName} onChange={(v) => set("accountHolderName", v)} required />
              <Select label={t('applyGrantForm.accountType')} value={form.accountType} onChange={(v) => set("accountType", v)} options={[t('applyGrantForm.accTypeChecking'), t('applyGrantForm.accTypeSavings')]} required />
              <Field label={t('applyGrantForm.routingNumber')} value={form.routingNumber} onChange={(v) => set("routingNumber", v.replace(/\D/g, "").slice(0, 9))} required />
              <Field label={t('applyGrantForm.accountNumber')} value={form.accountNumber} onChange={(v) => set("accountNumber", v.replace(/\D/g, ""))} required />
              <Field label={t('applyGrantForm.confirmAccountNumber')} value={form.confirmAccountNumber} onChange={(v) => set("confirmAccountNumber", v.replace(/\D/g, ""))} required />
            </Grid>
          </Section>

          <Section n={5} title={t('applyGrantForm.sec5Title')}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-forest" checked={form.certifyTrue} onChange={(e) => set("certifyTrue", e.target.checked)} />
              <span className="text-sm text-foreground/90">
                {t('applyGrantForm.certifyLabel')}
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-forest" checked={form.consentVerify} onChange={(e) => set("consentVerify", e.target.checked)} />
              <span className="text-sm text-foreground/90">
                {t('applyGrantForm.consentLabel')}
              </span>
            </label>
          </Section>

          <div className="rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-background to-gold/5 p-6">
            <div className="flex items-start gap-3">
              <Sprout className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
              <div>
                <p className="font-display text-xl font-semibold text-forest">{t('applyGrantForm.pureGrantTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('applyGrantForm.pureGrantDesc')}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-forest" /> {t('applyGrantForm.badgeEncryption')}</span>
                  <span className="inline-flex items-center gap-1.5"><Landmark className="h-4 w-4 text-forest" /> {t('applyGrantForm.badgeBacked')}</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-forest" /> {t('applyGrantForm.badgeDecision')}</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-7 py-4 text-base font-semibold text-primary shadow-gold transition hover:translate-y-[-2px] disabled:opacity-60">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {submitting ? t('applyGrantForm.submitting') : t('applyGrantForm.submitApplication')}
          </button>
        </form>
      </main>
    </div>
  );
}

function Section({ n, title, desc, children, highlight }: { n: number; title: string; desc?: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${highlight ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-border bg-card"} shadow-card`}>
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-forest text-sm font-semibold text-forest-foreground">{n}</span>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
      </div>
      {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}
function Field({ label, value, onChange, type = "text", required, prefix, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; prefix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "required">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="text-gold"> *</span>}</span>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input {...rest} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40 ${prefix ? "pl-7" : ""}`} />
      </div>
    </label>
  );
}
function Select({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="text-gold"> *</span>}</span>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Textarea({ label, value, onChange, required, minLength, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; minLength?: number; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="text-gold"> *</span>}</span>
      <textarea required={required} minLength={minLength} rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40" />
    </label>
  );
}
