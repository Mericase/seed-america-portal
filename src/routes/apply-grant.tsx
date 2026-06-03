import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sprout, ShieldCheck, Landmark, CheckCircle2 } from "lucide-react";
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
  component: ApplyGrant,
});

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

const EMPLOYMENT = ["Employed full-time", "Employed part-time", "Self-employed", "Unemployed", "Retired", "Student", "Disabled / Unable to work"];
const MARITAL = ["Single", "Married", "Divorced", "Widowed", "Domestic Partnership"];
const HOUSING = ["Own", "Rent", "Mortgaged", "Living with family", "Homeless / Temporary"];
const EDUCATION = ["Less than High School", "High School / GED", "Some College", "Associate Degree", "Bachelor's Degree", "Master's Degree", "Doctorate"];
const ETHNICITY = ["American Indian / Alaska Native", "Asian", "Black / African American", "Hispanic / Latino", "Native Hawaiian / Pacific Islander", "White", "Two or more races", "Prefer not to say"];
const URGENCY = ["Within 7 days", "Within 30 days", "Within 90 days", "No immediate deadline"];

function ApplyGrant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState<number>(1);

  const [form, setForm] = useState({
    // Personal & household
    maritalStatus: "",
    dependents: "",
    householdSize: "",
    householdIncome: "",
    incomeFrequency: "Annual",
    employmentStatus: "",
    employer: "",
    occupation: "",
    monthlyExpenses: "",
    education: "",
    ethnicity: "",
    veteran: "",
    disability: "",
    housingStatus: "",
    state: "",
    city: "",
    zip: "",
    // Grant request
    grantType: "",
    grantTypeOther: "",
    amountRequested: "",
    urgency: "",
    purposeDescription: "",
    receivedGovAidBefore: "",
    receivedGovAidDetails: "",
    hasPublicRecord: "",
    // Disbursement
    bankName: "",
    accountHolderName: "",
    accountType: "Checking",
    accountNumber: "",
    confirmAccountNumber: "",
    routingNumber: "",
    // Consent
    certifyTrue: false,
    consentVerify: false,
  });

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

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.grantType === "Other" && !form.grantTypeOther.trim()) {
      return toast.error("Please specify what you need the grant for.");
    }
    if (form.accountNumber !== form.confirmAccountNumber) {
      return toast.error("Account numbers do not match.");
    }
    if (!/^\d{9}$/.test(form.routingNumber)) {
      return toast.error("Routing number must be 9 digits.");
    }
    if (!form.certifyTrue || !form.consentVerify) {
      return toast.error("Please agree to the certifications to continue.");
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }
      const { error } = await supabase.from("grant_applications").insert({
        user_id: session.user.id,
        status: "pending",
        marital_status: form.maritalStatus,
        dependents: form.dependents ? parseInt(form.dependents) : null,
        household_size: form.householdSize ? parseInt(form.householdSize) : null,
        education: form.education,
        ethnicity: form.ethnicity,
        housing_status: form.housingStatus,
        veteran: form.veteran,
        disability: form.disability,
        state: form.state,
        city: form.city,
        zip: form.zip,
        employment_status: form.employmentStatus,
        employer: form.employer,
        occupation: form.occupation,
        household_income: form.householdIncome ? Number(form.householdIncome) : null,
        income_frequency: form.incomeFrequency,
        monthly_expenses: form.monthlyExpenses ? Number(form.monthlyExpenses) : null,
        received_gov_aid_before: form.receivedGovAidBefore,
        received_gov_aid_details: form.receivedGovAidDetails,
        has_public_record: form.hasPublicRecord,
        grant_type: form.grantType,
        grant_type_other: form.grantTypeOther,
        amount_requested: form.amountRequested ? Number(form.amountRequested) : null,
        urgency: form.urgency,
        purpose_description: form.purposeDescription,
        bank_name: form.bankName,
        account_holder_name: form.accountHolderName,
        account_type: form.accountType,
        account_number: form.accountNumber,
        routing_number: form.routingNumber,
      });
      if (error) throw error;
      toast.success("Grant application submitted", {
        description: "We'll review and respond within 14 business days.",
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-forest">
          <Sprout className="h-4 w-4" /> Tier {tier} Verified
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Grant Application</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Complete every field truthfully. All information is encrypted and shared only with federal disbursement reviewers.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-10">
          {/* Section 1 — Household */}
          <Section
            n={1}
            title="Household & Personal Information"
            desc="Helps determine your eligibility tier and award amount."
          >
            <Grid>
              <Select label="Marital Status" value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL} required />
              <Field label="Number of Dependents" type="number" min={0} value={form.dependents} onChange={(v) => set("dependents", v)} required />
              <Field label="Total Household Size" type="number" min={1} value={form.householdSize} onChange={(v) => set("householdSize", v)} required />
              <Select label="Highest Education" value={form.education} onChange={(v) => set("education", v)} options={EDUCATION} required />
              <Select label="Ethnicity" value={form.ethnicity} onChange={(v) => set("ethnicity", v)} options={ETHNICITY} required />
              <Select label="Housing Status" value={form.housingStatus} onChange={(v) => set("housingStatus", v)} options={HOUSING} required />
              <Select label="U.S. Military Veteran?" value={form.veteran} onChange={(v) => set("veteran", v)} options={["No", "Yes — Active", "Yes — Reserve / Guard", "Yes — Honorably Discharged"]} required />
              <Select label="Living with a Disability?" value={form.disability} onChange={(v) => set("disability", v)} options={["No", "Yes — Physical", "Yes — Mental Health", "Yes — Both", "Prefer not to say"]} required />
              <Field label="State of Residence" value={form.state} onChange={(v) => set("state", v)} required />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} required />
              <Field label="ZIP Code" value={form.zip} onChange={(v) => set("zip", v)} required maxLength={10} />
            </Grid>
          </Section>

          {/* Section 2 — Financial */}
          <Section n={2} title="Employment & Financial Status" desc="All amounts in USD. Be exact — applications are cross-checked against IRS records.">
            <Grid>
              <Select label="Employment Status" value={form.employmentStatus} onChange={(v) => set("employmentStatus", v)} options={EMPLOYMENT} required />
              <Field label="Employer / Business Name" value={form.employer} onChange={(v) => set("employer", v)} />
              <Field label="Occupation / Job Title" value={form.occupation} onChange={(v) => set("occupation", v)} />
              <Field label="Household Annual Income (USD)" type="number" min={0} value={form.householdIncome} onChange={(v) => set("householdIncome", v)} required prefix="$" />
              <Select label="Income Frequency" value={form.incomeFrequency} onChange={(v) => set("incomeFrequency", v)} options={["Annual", "Monthly", "Weekly"]} required />
              <Field label="Average Monthly Expenses (USD)" type="number" min={0} value={form.monthlyExpenses} onChange={(v) => set("monthlyExpenses", v)} required prefix="$" />
              <Select label="Received Government Aid Before?" value={form.receivedGovAidBefore} onChange={(v) => set("receivedGovAidBefore", v)} options={["No", "Yes"]} required />
              <Select label="Any Bankruptcies or Liens on Record?" value={form.hasPublicRecord} onChange={(v) => set("hasPublicRecord", v)} options={["No", "Yes"]} required />
            </Grid>
            {form.receivedGovAidBefore === "Yes" && (
              <Textarea label="Briefly describe previous aid received (program, year, amount)" value={form.receivedGovAidDetails} onChange={(v) => set("receivedGovAidDetails", v)} required />
            )}
          </Section>

          {/* Section 3 — Grant Request */}
          <Section n={3} title="Grant Request" desc="Seedin America offers a wide range of grants. Choose the one that matches your need.">
            <Grid>
              <Select label="Type of Grant Needed" value={form.grantType} onChange={(v) => set("grantType", v)} options={GRANT_TYPES} required />
              <Select label="How Urgently Do You Need Funds?" value={form.urgency} onChange={(v) => set("urgency", v)} options={URGENCY} required />
              <Field label="Amount Requested (USD)" type="number" min={1} value={form.amountRequested} onChange={(v) => set("amountRequested", v)} required prefix="$" />
            </Grid>
            {form.grantType === "Other" && (
              <Field label="Please specify what you need the grant for" value={form.grantTypeOther} onChange={(v) => set("grantTypeOther", v)} required />
            )}
            <Textarea
              label="Tell us how this grant will change your life or business (minimum 100 characters)"
              value={form.purposeDescription}
              onChange={(v) => set("purposeDescription", v)}
              required
              minLength={100}
              rows={5}
            />
          </Section>

          {/* Section 4 — Disbursement */}
          <Section
            n={4}
            title="Disbursement Bank Details"
            desc="The grant amount will be disbursed directly into the bank account provided below. Ensure the details are correct — Seedin America is not liable for funds sent to incorrect accounts."
            highlight
          >
            <Grid>
              <Field label="Bank Name" value={form.bankName} onChange={(v) => set("bankName", v)} required />
              <Field label="Account Holder's Full Name" value={form.accountHolderName} onChange={(v) => set("accountHolderName", v)} required />
              <Select label="Account Type" value={form.accountType} onChange={(v) => set("accountType", v)} options={["Checking", "Savings"]} required />
              <Field label="Routing Number (9 digits)" value={form.routingNumber} onChange={(v) => set("routingNumber", v.replace(/\D/g, "").slice(0, 9))} required />
              <Field label="Account Number" value={form.accountNumber} onChange={(v) => set("accountNumber", v.replace(/\D/g, ""))} required />
              <Field label="Confirm Account Number" value={form.confirmAccountNumber} onChange={(v) => set("confirmAccountNumber", v.replace(/\D/g, ""))} required />
            </Grid>
          </Section>

          {/* Certifications */}
          <Section n={5} title="Certification & Consent">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-forest" checked={form.certifyTrue} onChange={(e) => set("certifyTrue", e.target.checked)} />
              <span className="text-sm text-foreground/90">
                I certify under penalty of perjury that all information provided is true, complete, and accurate. I understand that false statements may result in denial, repayment demand, and federal prosecution.
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-forest" checked={form.consentVerify} onChange={(e) => set("consentVerify", e.target.checked)} />
              <span className="text-sm text-foreground/90">
                I authorize Seedin America to verify my identity, income, and bank information with relevant federal agencies and financial institutions for the purpose of processing this grant.
              </span>
            </label>
          </Section>

          {/* Reassurance */}
          <div className="rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-background to-gold/5 p-6">
            <div className="flex items-start gap-3">
              <Sprout className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
              <div>
                <p className="font-display text-xl font-semibold text-forest">Pure grants. We never take equity, royalties, or repayment.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is a grant — not a loan. No repayment is required, ever. Funds are disbursed by the U.S. Treasury under the public-private American Growth Mandate.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-forest" /> Bank-grade encryption</span>
                  <span className="inline-flex items-center gap-1.5"><Landmark className="h-4 w-4 text-forest" /> Government backed</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-forest" /> Decision in 14 business days</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-7 py-4 text-base font-semibold text-primary shadow-gold transition hover:translate-y-[-2px] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {submitting ? "Submitting…" : "Submit Grant Application"}
          </button>
        </form>
      </main>
    </div>
  );
}

/* ---------- Reusable bits ---------- */

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
        <input
          {...rest}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40 ${prefix ? "pl-7" : ""}`}
        />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="text-gold"> *</span>}</span>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40"
      >
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
      <textarea
        required={required}
        minLength={minLength}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest/40"
      />
    </label>
  );
}
