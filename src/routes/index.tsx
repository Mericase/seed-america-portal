import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ShieldCheck, Sprout, Landmark, BadgeCheck, GraduationCap, Home, HeartPulse, Briefcase, Coins, Flag } from "lucide-react";
import heroImg from "@/assets/hero-seedling.jpg";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seedin — Grants for Business, Debt, Tuition & More" },
      { name: "description", content: "Globally recognized grants for individuals and entrepreneurs: business capital, student loan repayment, mortgage relief, accident recovery and more. Plant the seed." },
      { property: "og:title", content: "Seedin" },
      { property: "og:description", content: "Plant the seed. Grow the dream. Grants for life's biggest moments." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <img
          src={heroImg}
          alt="Diverse entrepreneurs building their businesses"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero-overlay" style={{ backgroundImage: "var(--gradient-hero-overlay)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, transparent 0%, oklch(0.12 0.05 260 / 0.6) 70%)" }} />

        {/* Flag strip */}
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{t("landing.serving")}</span>
          <span className="text-xl leading-none" title="United States">🇺🇸</span>
          <span className="text-xl leading-none" title="Canada">🇨🇦</span>
          <span className="text-xl leading-none" title="Australia">🇦🇺</span>
          <span className="text-xl leading-none" title="Germany">🇩🇪</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{t("landing.andMore")}</span>
        </div>

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <Logo variant="light" />
          <div className="flex items-center gap-2">
            <Link to="/signin" className="rounded-full px-5 py-2 text-sm font-medium text-white/90 hover:text-white">
              {t("common.signIn")}
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary shadow-gold transition hover:scale-[1.02]"
            >
              {t("common.signUp")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 md:pt-32">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {t("landing.badge")}
          </span>
          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.08] text-white text-balance sm:text-5xl md:text-7xl">
            {t("landing.heroTitle")} <span className="text-gold">{t("landing.heroHighlight")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
            {t("landing.heroDesc")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-4 text-base font-semibold text-primary shadow-gold transition hover:translate-y-[-2px]"
            >
              {t("landing.beginApplication")}
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-md hover:bg-white/10"
            >
              {t("landing.memberSignIn")}
            </Link>
          </div>

          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3 border-t border-white/15 pt-8">
            <Stat value="$4.2B" label={t("landing.fundsDeployed")} />
            <Stat value="312,000+" label={t("landing.peopleHelped")} />
            <Stat value={t("landing.reachValue")} label={t("landing.reach")} />
          </div>
        </div>
      </section>

      {/* Grant categories */}
      <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-forest">
              <Flag className="h-3.5 w-3.5" /> {t("landing.grantsForEveryone")}
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              {t("landing.fundMoreTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.fundMoreDesc")}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Category icon={<Briefcase className="h-5 w-5" />} title={t("landing.businessCapital")} desc={t("landing.businessCapitalDesc")} />
            <Category icon={<GraduationCap className="h-5 w-5" />} title={t("landing.studentLoan")} desc={t("landing.studentLoanDesc")} />
            <Category icon={<Home className="h-5 w-5" />} title={t("landing.mortgageAid")} desc={t("landing.mortgageAidDesc")} />
            <Category icon={<HeartPulse className="h-5 w-5" />} title={t("landing.accidentRelief")} desc={t("landing.accidentReliefDesc")} />
            <Category icon={<Coins className="h-5 w-5" />} title={t("landing.debtRepayment")} desc={t("landing.debtRepaymentDesc")} />
            <Category icon={<Sprout className="h-5 w-5" />} title={t("landing.familyHousing")} desc={t("landing.familyHousingDesc")} />
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-14 md:grid-cols-3">
          <Pillar icon={<ShieldCheck className="h-6 w-6" />} title={t("landing.federallySecured")}>
            {t("landing.federallySecuredDesc")}
          </Pillar>
          <Pillar icon={<Landmark className="h-6 w-6" />} title={t("landing.governmentBacked")}>
            {t("landing.governmentBackedDesc")}
          </Pillar>
          <Pillar icon={<Sprout className="h-6 w-6" />} title={t("landing.nonDilutive")}>
            {t("landing.nonDilutiveDesc")}
          </Pillar>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary px-6 py-24 text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <BadgeCheck className="mx-auto mb-6 h-12 w-12 text-gold" />
          <h2 className="font-display text-4xl font-semibold md:text-5xl">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
            {t("landing.ctaDesc")}
          </p>
          <Link
            to="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-base font-semibold text-primary shadow-gold hover:scale-[1.02]"
          >
            {t("landing.startApplication")} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Seedin. {t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-gold md:text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.15em] text-white/70">{label}</div>
    </div>
  );
}

function Pillar({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">{icon}</div>
      <div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function Category({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-forest/40">
      <div className="inline-grid h-11 w-11 place-items-center rounded-xl bg-gradient-forest text-forest-foreground shadow-elegant">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
