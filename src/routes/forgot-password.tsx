import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { sendPasswordReset, resetPasswordWithOtp } from "@/lib/password-reset.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Seedin" },
      { name: "description", content: "Reset your Seedin account password with a verification code." },
    ],
  }),
  component: ForgotPasswordPage,
});

type Step = "email" | "code" | "newpass" | "done";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Step 1: send code ────────────────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const origin = window.location.origin;
      const result = await sendPasswordReset({ data: { email: email.trim().toLowerCase(), origin } });
      // Always advance (server never reveals whether email exists)
      setStep("code");
      setResendCooldown(60);
      toast.success("Verification code sent — check your inbox.");
    } catch {
      toast.error("Could not send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify 6-digit code ─────────────────────────────────────────
  function handleCodeInput(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleCodeKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const enteredCode = code.join("");
    if (enteredCode.length < 6) return toast.error("Please enter the full 6-digit code.");
    setLoading(true);
    try {
      const result = await resetPasswordWithOtp({
        data: { email: email.trim().toLowerCase(), code: enteredCode },
      });
      if (!result.ok) {
        toast.error(result.message || "Invalid or expired code. Please try again.");
        return;
      }
      setResetToken(result.token);
      setStep("newpass");
    } catch {
      toast.error("Could not verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: set new password ─────────────────────────────────────────────
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return toast.error("Please enter a password.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      const { resetPassword } = await import("@/lib/password-reset.functions");
      const result = await resetPassword({ data: { token: resetToken, newPassword: password } });
      if (!result.ok) {
        toast.error(result.message || "Could not update your password.");
        return;
      }
      setStep("done");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-primary lg:block">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 20%, oklch(0.45 0.12 155 / 0.4), transparent 60%)" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Logo variant="light" />
          <div>
            <h2 className="font-display text-5xl font-semibold leading-[1.05] text-balance">
              Locked out? <span className="text-gold">We've got you.</span>
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Enter your email, get a 6-digit code, and choose a new password — takes under two minutes.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4" /> 256-bit encrypted · FISMA compliant
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-6">
          <div className="lg:hidden"><Logo /></div>
          <Link to="/signin" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">

            {/* ── Step 1: email ── */}
            {step === "email" && (
              <>
                <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="font-display text-4xl font-semibold">Forgot password?</h1>
                <p className="mt-2 text-muted-foreground">
                  Enter the email linked to your account and we'll send a 6-digit verification code.
                </p>
                <form className="mt-8 space-y-5" onSubmit={handleSendCode}>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                      placeholder="you@example.com"
                    />
                  </label>
                  <button
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</> : <>Send verification code <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/signin" className="font-semibold text-forest hover:underline">Sign in</Link>
                </p>
              </>
            )}

            {/* ── Step 2: 6-digit code ── */}
            {step === "code" && (
              <>
                <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="font-display text-4xl font-semibold">Enter the code</h1>
                <p className="mt-2 text-muted-foreground">
                  We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. It expires in 60 minutes.
                </p>

                <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
                  {/* OTP digit inputs */}
                  <div className="flex gap-3 justify-center" onPaste={handleCodePaste}>
                    {code.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeInput(idx, e.target.value)}
                        onKeyDown={(e) => handleCodeKey(idx, e)}
                        className="h-14 w-12 rounded-xl border-2 border-input bg-background text-center text-xl font-semibold outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
                        aria-label={`Digit ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    disabled={loading || code.join("").length < 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify code <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Didn't receive it?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      className="font-semibold text-forest hover:underline"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const resendResult = await sendPasswordReset({ data: { email: email.trim().toLowerCase(), origin: window.location.origin } });
                          void resendResult;
                          toast.success("New code sent.");
                          setResendCooldown(60);
                          setCode(["", "", "", "", "", ""]);
                          inputRefs.current[0]?.focus();
                        } catch {
                          toast.error("Could not resend. Please try again.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Resend code
                    </button>
                  )}
                </div>

                <button
                  className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("email"); setCode(["", "", "", "", "", ""]); }}
                >
                  ← Change email address
                </button>
              </>
            )}

            {/* ── Step 3: new password ── */}
            {step === "newpass" && (
              <>
                <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                  <Lock className="h-6 w-6" />
                </div>
                <h1 className="font-display text-4xl font-semibold">New password</h1>
                <p className="mt-2 text-muted-foreground">Choose a strong password you haven't used before.</p>

                <form className="mt-8 space-y-5" onSubmit={handleSetPassword}>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                    />
                    {password.length > 0 && (
                      <PasswordStrength password={password} />
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</span>
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                    />
                    {confirm.length > 0 && password !== confirm && (
                      <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                    )}
                  </label>
                  <button
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : <><Lock className="h-4 w-4" /> Update password <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </>
            )}

            {/* ── Step 4: done ── */}
            {step === "done" && (
              <div className="text-center">
                <div className="mb-6 inline-grid h-16 w-16 place-items-center rounded-full bg-forest/10 text-forest">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="font-display text-4xl font-semibold">Password updated!</h1>
                <p className="mt-3 text-muted-foreground">
                  Your password has been successfully changed. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => navigate({ to: "/signin" })}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
                >
                  Sign in now <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// ── Password strength indicator ──────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 1,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ["Weak", "Fair", "Good", "Strong"][score - 1] ?? "Weak";
  const color = ["bg-red-400", "bg-amber-400", "bg-lime-400", "bg-forest"][score - 1] ?? "bg-red-400";

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? color : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
