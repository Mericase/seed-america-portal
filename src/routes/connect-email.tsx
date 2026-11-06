import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Bell, CheckCircle2, Loader2, Lock, Mail,
  ShieldCheck, Unplug, Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getLinkedEmail, startProviderConnect, completeProviderConnect,
  sendEmailOtp, verifyEmailOtp, disconnectLinkedEmail,
} from "@/lib/connect-email.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/connect-email")({
  head: () => ({
    meta: [
      { title: "Connect Your Email — Seedin" },
      { name: "description", content: "Add a third layer of security to your Seedin account, get faster reviews, and never miss a grant notification by linking your everyday email." },
      { property: "og:title", content: "Connect Your Email — Seedin" },
      { property: "og:description", content: "Link your everyday inbox for stronger account security and faster grant reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectEmailPage,
});

type Linked = {
  email: string;
  provider: string;
  method: string;
  verified_at: string | null;
} | null;

const PROVIDER_LABEL: Record<string, string> = {
  gmail: "Gmail", outlook: "Outlook", yahoo: "Yahoo Mail",
  icloud: "iCloud Mail", aol: "AOL Mail", other: "Email",
};

function ConnectEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linked, setLinked] = useState<Linked>(null);

  const refresh = useCallback(async () => {
    const row = await getLinkedEmail();
    setLinked(row as Linked);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/signin", replace: true });
        return;
      }
      try {
        await refresh();
      } catch {
        /* first-load read failures shouldn't block the page */
      }
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <Logo />
          <Link to="/settings" className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> {t('connectEmail.settingsBack')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-8 sm:px-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{t('connectEmail.heroLabel')}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary-foreground sm:text-4xl">
              {t('connectEmail.heroTitle')}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              {t('connectEmail.heroDesc')}
            </p>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-3 sm:p-8">
            <Benefit
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t('connectEmail.benefit1Title')}
              body={t('connectEmail.benefit1Body')}
            />
            <Benefit
              icon={<Zap className="h-5 w-5" />}
              title={t('connectEmail.benefit2Title')}
              body={t('connectEmail.benefit2Body')}
            />
            <Benefit
              icon={<Bell className="h-5 w-5" />}
              title={t('connectEmail.benefit3Title')}
              body={t('connectEmail.benefit3Body')}
            />
          </div>

          <div className="flex items-start gap-2.5 border-t border-border bg-muted/40 px-6 py-4 text-xs leading-relaxed text-muted-foreground sm:px-8">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            <p>{t('connectEmail.privacyNote')}</p>
          </div>
        </section>

        {!ready ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linked ? (
          <ConnectedCard linked={linked} onDisconnected={() => setLinked(null)} />
        ) : (
          <>
            <ProviderCard onLinked={refresh} />
            <OtpCard onLinked={refresh} />
          </>
        )}
      </main>
    </div>
  );
}

/* ── Connected state ─────────────────────────────────────── */

function ConnectedCard({ linked, onDisconnected }: { linked: NonNullable<Linked>; onDisconnected: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectLinkedEmail();
      onDisconnected();
      toast.success(t('connectEmail.disconnected'));
    } catch {
      toast.error(t('connectEmail.disconnectFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-forest/30 bg-forest/5 p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold">{t('connectEmail.connectedTitle')}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{linked.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest">
              <BadgeCheck className="h-3.5 w-3.5" />
              {PROVIDER_LABEL[linked.provider] ?? linked.provider}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {linked.method === "oauth" ? t('connectEmail.verifiedByProvider') : t('connectEmail.verifiedByCode')}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={disconnect}
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-background px-5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} {t('connectEmail.disconnectEmail')}
      </button>
    </section>
  );
}

/* ── Provider OAuth ──────────────────────────────────────── */

function waitForOAuth(popup: Window, provider: string) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.provider !== provider ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("The connection was not completed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The sign-in window closed before finishing."));
    }, 500);
  });
}

function ProviderCard({ onLinked }: { onLinked: () => Promise<void> }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const connect = async (provider: "gmail" | "outlook") => {
    setBusy(provider);
    const popup = window.open("", "seedin-email-oauth", "width=600,height=740");
    if (!popup) {
      setBusy(null);
      return toast.error(t('connectEmail.popupBlocked'));
    }
    try {
      const start = await startProviderConnect({ data: { provider } });
      if (!start.ok) {
        popup.close();
        return toast.error(start.message);
      }
      const done = waitForOAuth(popup, provider);
      popup.location.href = start.authorizationUrl;
      const code = await done;
      if (code) {
        await completeProviderConnect({ data: { code, provider } });
        await onLinked();
        toast.success(t('connectEmail.connectedSecurely'));
      }
    } catch (e) {
      popup.close();
      toast.error(e instanceof Error ? e.message : t('connectEmail.connectionFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('connectEmail.recommendedLabel')}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{t('connectEmail.providerTitle')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('connectEmail.providerDesc')}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProviderButton
          label={t('connectEmail.gmailBtn')}
          sub={t('connectEmail.gmailSub')}
          busy={busy === "gmail"}
          disabled={busy !== null}
          onClick={() => connect("gmail")}
        />
        <ProviderButton
          label={t('connectEmail.outlookBtn')}
          sub={t('connectEmail.outlookSub')}
          busy={busy === "outlook"}
          disabled={busy !== null}
          onClick={() => connect("outlook")}
        />
      </div>
    </section>
  );
}

function ProviderButton({ label, sub, busy, disabled, onClick }: {
  label: string; sub: string; busy: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-4 text-left transition hover:border-forest hover:bg-accent disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-forest">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

/* ── OTP fallback ────────────────────────────────────────── */

function OtpCard({ onLinked }: { onLinked: () => Promise<void> }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error(t('connectEmail.invalidEmail'));
    setBusy(true);
    try {
      const res = await sendEmailOtp({ data: { email: email.trim() } });
      if (!res.ok) return toast.error(res.message);
      setStage("code");
      toast.success(t('connectEmail.otpSent'), { description: t('connectEmail.otpSentDesc', { email: email.trim() }) });
    } catch {
      toast.error(t('connectEmail.codeSendFailed'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return toast.error(t('connectEmail.invalidCode'));
    setBusy(true);
    try {
      const res = await verifyEmailOtp({ data: { email: email.trim(), code } });
      if (!res.ok) return toast.error(res.message);
      await onLinked();
      toast.success(t('connectEmail.verifiedConnected'));
    } catch {
      toast.error(t('connectEmail.verifyFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('connectEmail.otherLabel')}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{t('connectEmail.otherTitle')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('connectEmail.otherDesc')}
      </p>

      {stage === "email" ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          <button
            onClick={request}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-forest px-5 py-3 text-sm font-semibold text-forest-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {t('connectEmail.sendCode')}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('connectEmail.codeExpiry', { email })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full flex-1 rounded-lg border border-input bg-background px-4 py-3 text-center text-lg font-semibold tracking-[0.4em] outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
            <button
              onClick={verify}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-forest px-5 py-3 text-sm font-semibold text-forest-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} {t('connectEmail.verifyBtn')}
            </button>
          </div>
          <button
            onClick={() => { setStage("email"); setCode(""); }}
            className="text-xs font-semibold text-muted-foreground underline underline-offset-4"
          >
            {t('connectEmail.useDifferentEmail')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Bits ────────────────────────────────────────────────── */

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-forest">{icon}</span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
