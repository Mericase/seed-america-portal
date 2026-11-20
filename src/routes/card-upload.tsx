import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Camera, CheckCircle2, Loader2, Lock, ShieldCheck, Upload,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { submitCardUpload } from "@/lib/card-upload.functions";

export const Route = createFileRoute("/card-upload")({
  head: () => ({
    meta: [
      { title: "Identity Card Upload — Seedin" },
      { name: "description", content: "Upload your identity card for compliance verification." },
    ],
  }),
  component: CardUploadPage,
});

// ─── FileSlot ─────────────────────────────────────────────────────────────────
// Same component pattern as upgrade-tier.tsx

function FileSlot({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint?: string;
  file?: File;
  onChange: (f: File) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative flex h-52 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-4 text-sm transition ${
          file
            ? "border-forest bg-forest/5"
            : "border-border bg-accent/30 hover:border-forest/50 hover:bg-accent/50"
        }`}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-forest/10 group-hover:text-forest">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-medium text-foreground">Tap to upload</span>
            {hint && (
              <span className="text-xs text-muted-foreground">{hint}</span>
            )}
            <span className="text-xs text-muted-foreground">JPG / PNG / HEIC accepted</span>
          </>
        )}
        {file && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-xs font-semibold text-forest-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function CardUploadPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | undefined>();
  const [backFile, setBackFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const doSubmit = useServerFn(submitCardUpload);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { navigate({ to: "/signin" }); return; }
      setUserId(data.session.user.id);

      // Guard: if no upload is actually requested, send them to dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("card_upload_requested, card_upload_submitted_at")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (!profile?.card_upload_requested || profile.card_upload_submitted_at) {
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate]);

  const canSubmit = !!frontFile && !!backFile && !submitting;

  const handleSubmit = async () => {
    if (!userId || !frontFile || !backFile) return;
    setSubmitting(true);
    try {
      // Upload front
      const frontExt = frontFile.name.split(".").pop() ?? "jpg";
      const frontPath = `${userId}/card-upload/front.${frontExt}`;
      const { error: fe } = await supabase.storage
        .from("verification")
        .upload(frontPath, frontFile, { upsert: true });
      if (fe) throw new Error(`Front upload failed: ${fe.message}`);

      // Upload back
      const backExt = backFile.name.split(".").pop() ?? "jpg";
      const backPath = `${userId}/card-upload/back.${backExt}`;
      const { error: be } = await supabase.storage
        .from("verification")
        .upload(backPath, backFile, { upsert: true });
      if (be) throw new Error(`Back upload failed: ${be.message}`);

      // Record paths on the profile + mark submitted
      await doSubmit({ data: { frontPath, backPath } });

      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-background pb-20">

      {/* ── Success overlay ── same style as upgrade-tier.tsx ───────────────── */}
      {submitted && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Documents Received
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                Thank you — upload complete!
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Your identity card has been submitted and is now under review by our compliance team.
              </p>
            </div>
            <div className="space-y-4 p-7 text-sm">
              <div className="rounded-xl border border-forest/30 bg-forest/5 p-4">
                <p className="font-semibold text-foreground">What happens next</p>
                <p className="mt-1 text-muted-foreground">
                  Our team will review your documents and update your account status shortly.
                  You will receive an in-app notification once the review is complete.
                  No action is required from you at this time.
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Logo />
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </header>

      {/* ── Main card ────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">

          {/* Card header */}
          <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Identity Verification
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
              Card Verification
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Upload a photo of your debit or credit card to complete your one-time verification.
              Your card is <strong className="text-gold">never charged</strong> and your details are
              stored in a private encrypted vault — no one can view them.
            </p>
          </div>

          <div className="space-y-8 p-8">

            {/* Trust notice */}
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 text-sm">
              <p className="font-semibold text-foreground">Your privacy is protected</p>
              <ul className="mt-3 space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <span>
                    Your card image is uploaded directly into a <strong className="text-foreground">private encrypted vault</strong>.
                    Nobody — including any staff — can view or access it once submitted.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <span>
                    <strong className="text-foreground">Your card will not be charged.</strong>{" "}
                    No financial action is taken as part of this process. You will always be explicitly
                    informed and asked to approve any transaction.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <span>
                    This is a <strong className="text-foreground">one-time upload</strong>. Once verified,
                    you will never be asked to do this again.
                  </span>
                </li>
              </ul>
            </div>

            {/* Upload slots */}
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">
                Your Debit or Credit Card
              </p>
              <p className="mb-5 text-xs text-muted-foreground">
                Upload a clear, well-lit photo of both sides of your card. All four corners must be visible.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <FileSlot
                  label="Front of Card"
                  hint="Hold the card flat — all corners visible"
                  file={frontFile}
                  onChange={setFrontFile}
                />
                <FileSlot
                  label="Back of Card"
                  hint="Ensure the signature strip is fully visible"
                  file={backFile}
                  onChange={setBackFile}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="border-t border-border pt-6">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading documents…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Submit Documents</>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Both sides of your card are required. You will be returned to your dashboard once submitted.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
