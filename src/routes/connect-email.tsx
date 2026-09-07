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

export const Route = createFileRoute("/connect-email")({
  head: () => ({
    meta: [
      { title: "Connect Your Email — Seedin America" },
      { name: "description", content: "Add a third layer of security to your Seedin America account, get faster reviews, and never miss a grant notification by linking your everyday email." },
      { property: "og:title", content: "Connect Your Email — Seedin America" },
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
            <ArrowLeft className="h-4 w-4" /> Settings
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-8 sm:px-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Account Protection</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary-foreground sm:text-4xl">
              Connect your everyday email
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              Members who link a verified inbox move through review faster and carry a stronger, harder-to-compromise
              account. It takes under a minute, and you stay in complete control.
            </p>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-3 sm:p-8">
            <Benefit
              icon={<ShieldCheck className="h-5 w-5" />}
              title="A third layer of security"
              body="Beyond your password and sign-in code, a verified inbox lets us confirm it's really you before any balance, tier or withdrawal change is processed."
            />
            <Benefit
              icon={<Zap className="h-5 w-5" />}
              title="Faster reviews"
              body="Applications from members with a confirmed inbox skip a manual identity step, which typically shortens review time considerably."
            />
            <Benefit
              icon={<Bell className="h-5 w-5" />}
              title="Never miss an award"
              body="Grant approvals, verification links and disbursement notices reach you reliably — even if you're away from the app."
            />
          </div>

          <div className="flex items-start gap-2.5 border-t border-border bg-muted/40 px-6 py-4 text-xs leading-relaxed text-muted-foreground sm:px-8">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            <p>
              Seedin America never sees or stores your email password. Provider sign-in happens entirely on Google's or
              Microsoft's own website, and you can disconnect at any time from this page.
            </p>
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
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectLinkedEmail();
      onDisconnected();
      toast.success("Email disconnected");
    } catch {
      toast.error("Couldn't disconnect right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-forest/30 bg-forest/5 p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold">Email connected</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{linked.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest">
              <BadgeCheck className="h-3.5 w-3.5" />
              {PROVIDER_LABEL[linked.provider] ?? linked.provider}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {linked.method === "oauth" ? "Verified by provider sign-in" : "Verified by code"}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={disconnect}
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-background px-5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} Disconnect email
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
  const [busy, setBusy] = useState<string | null>(null);

  const connect = async (provider: "gmail" | "outlook") => {
    setBusy(provider);
    const popup = window.open("", "seedin-email-oauth", "width=600,height=740");
    if (!popup) {
      setBusy(null);
      return toast.error("Please allow pop-ups for this site and try again.");
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
        toast.success("Email connected securely");
      }
    } catch (e) {
      popup.close();
      toast.error(e instanceof Error ? e.message : "Connection failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recommended</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Sign in with your email provider</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You'll be taken to the provider's own secure sign-in page. Seedin America never sees your password.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProviderButton
          label="Continue with Gmail"
          sub="Google Account"
          busy={busy === "gmail"}
          disabled={busy !== null}
          onClick={() => connect("gmail")}
        />
        <ProviderButton
          label="Continue with Outlook"
          sub="Microsoft Account"
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
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Enter a valid email address.");
    setBusy(true);
    try {
      const res = await sendEmailOtp({ data: { email: email.trim() } });
      if (!res.ok) return toast.error(res.message);
      setStage("code");
      toast.success("Code sent", { description: `Check ${email.trim()} for a 6-digit code.` });
    } catch {
      toast.error("Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return toast.error("Enter the 6-digit code.");
    setBusy(true);
    try {
      const res = await verifyEmailOtp({ data: { email: email.trim(), code } });
      if (!res.ok) return toast.error(res.message);
      await onLinked();
      toast.success("Email verified and connected");
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Any other inbox</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Verify by code</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Using Yahoo, iCloud, AOL or a work address? We'll email you a 6-digit code to confirm the inbox is yours. No
        password required.
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send code
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter the code sent to <span className="font-semibold text-foreground">{email}</span>. It expires in 10 minutes.
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
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Verify
            </button>
          </div>
          <button
            onClick={() => { setStage("email"); setCode(""); }}
            className="text-xs font-semibold text-muted-foreground underline underline-offset-4"
          >
            Use a different email address
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
