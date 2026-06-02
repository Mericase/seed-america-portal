import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
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
            <p className="mt-2 text-muted-foreground">Sign in to your member dashboard.</p>

            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                setLoading(false);
                if (error) return toast.error(error.message);
                toast.success("Welcome back");
                navigate({ to: "/dashboard" });
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
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
          </div>
        </div>
      </main>
    </div>
  );
}
