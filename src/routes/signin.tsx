import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { signInWithUsername } from "@/lib/account.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In — Seedin America" },
      { name: "description", content: "Access your secure Seedin America member dashboard." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-primary lg:block">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 20%, oklch(0.45 0.12 155 / 0.4), transparent 60%)" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Logo variant="light" />
          <div>
            <h2 className="font-display text-5xl font-semibold leading-[1.05] text-balance">
              Your dream is <span className="text-gold">already funded.</span>
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Sign in to monitor your grant balance, manage referrals, and submit your funding application.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4" /> 256-bit encrypted · FISMA compliant
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-6">
          <div className="lg:hidden"><Logo /></div>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-4xl font-semibold">Welcome back.</h1>
            <p className="mt-2 text-muted-foreground">Sign in with your email address or username.</p>

            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const identifier = email.trim();
                try {
                  if (identifier.includes("@")) {
                    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
                    if (error) throw new Error(error.message);
                  } else {
                    const tokens = await signInWithUsername({ data: { username: identifier, password } });
                    if (!tokens.ok) throw new Error(tokens.message);
                    const { error } = await supabase.auth.setSession({
                      access_token: tokens.access_token,
                      refresh_token: tokens.refresh_token,
                    });
                    if (error) throw new Error(error.message);
                  }
                  toast.success("Welcome back");
                  navigate({ to: "/dashboard" });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not sign you in");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email or username</span>
                <input type="text" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
              </label>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-semibold text-forest hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
              </label>
              <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to Seedin America?{" "}
              <Link to="/signup" className="font-semibold text-forest hover:underline">Create an account</Link>
            </p>

            {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}

          </div>
        </div>
      </main>
    </div>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Account recovery</p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Reset your password</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, a secure password reset
              link is on its way. The link expires in 60 minutes — check your inbox and spam folder.
            </p>
            <button onClick={onClose} className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Done
            </button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSending(true);
              const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              setSending(false);
              if (error) return toast.error(error.message);
              setSent(true);
            }}
          >
            <p className="text-sm text-muted-foreground">
              Enter the email address on your Seedin America account and we'll send you a confirmation link to set a
              new password.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
            </label>
            <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Mail className="h-4 w-4" /> Send reset link</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
