import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Seedin America" },
      { name: "description", content: "Choose a new password for your Seedin America member account." },
      { property: "og:title", content: "Reset Password — Seedin America" },
      { property: "og:description", content: "Securely set a new password for your Seedin America account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-accent/40 via-background to-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-3xl font-semibold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready
              ? "Choose a strong password you haven't used before."
              : "Open this page from the secure link in your reset email to continue."}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password.length < 8) return toast.error("Password must be at least 8 characters.");
              if (password !== confirm) return toast.error("Passwords do not match.");
              setSaving(true);
              const { error } = await supabase.auth.updateUser({ password });
              setSaving(false);
              if (error) return toast.error(error.message);
              toast.success("Password updated — you're signed in.");
              navigate({ to: "/dashboard", replace: true });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</span>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" />
            </label>
            <button disabled={saving || !ready} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : <><Lock className="h-4 w-4" /> Update password <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/signin" className="font-semibold text-forest hover:underline">Back to sign in</Link>
          </p>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> 256-bit encrypted · FISMA compliant
          </p>
        </div>
      </div>
    </div>
  );
}
