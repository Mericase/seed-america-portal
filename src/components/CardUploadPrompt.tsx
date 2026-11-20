/**
 * CardUploadPrompt.tsx
 * Full-screen modal shown to a member when an admin has requested a card upload.
 * Drop this inside the dashboard just like Tier2LiveVerificationPrompt.
 *
 * Usage in dashboard.tsx:
 *   import { CardUploadPrompt } from "@/components/CardUploadPrompt";
 *   ...
 *   <CardUploadPrompt userId={profile.id} />
 */

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitCardUpload } from "@/lib/card-upload.functions";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type CardUploadRow = {
  card_upload_requested: boolean;
  card_upload_submitted_at: string | null;
};

// ─── FileSlot ────────────────────────────────────────────────────────────────
// Reusable upload slot — same style as upgrade-tier.tsx FileSlot.

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
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative flex h-44 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-4 text-sm transition ${
          file
            ? "border-forest bg-forest/5"
            : "border-border bg-accent/30 hover:border-forest/50 hover:bg-accent/50"
        }`}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover rounded-lg" />
        ) : (
          <>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground group-hover:bg-forest/10 group-hover:text-forest transition">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-medium text-foreground">Tap to upload</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            <span className="text-xs text-muted-foreground">JPG / PNG / HEIC</span>
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CardUploadPrompt({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [frontFile, setFrontFile] = useState<File | undefined>();
  const [backFile, setBackFile] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const doSubmit = useServerFn(submitCardUpload);

  // ── Poll/subscribe to the flag on the user's profile ─────────────────────
  useEffect(() => {
    let active = true;

    const checkFlag = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("card_upload_requested, card_upload_submitted_at")
        .eq("id", userId)
        .maybeSingle<CardUploadRow>();
      if (!active) return;
      if (data?.card_upload_requested && !data.card_upload_submitted_at) {
        setOpen(true);
        setSubmitted(false);
      }
    };

    checkFlag();

    // Realtime: show immediately if admin triggers while member is logged in
    const channel = supabase
      .channel(`card-upload-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as CardUploadRow;
          if (row.card_upload_requested && !row.card_upload_submitted_at) {
            setOpen(true);
            setSubmitted(false);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!open) return null;

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!frontFile || !backFile) {
      toast.error("Please upload both sides of your card before submitting.");
      return;
    }
    setBusy(true);
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

      // Record paths on the profile
      await doSubmit({ data: { frontPath, backPath } });

      setSubmitted(true);
      toast.success("Documents submitted — our team will review them shortly.");

      // Auto-close after 3 seconds
      setTimeout(() => setOpen(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Documents Received
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold">Thank you</h2>
            <p className="mt-1 text-sm text-white/80">
              Your documents have been submitted and are under review.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 p-7 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-forest/15 text-forest">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">
              Our compliance team will review your card and update your account status shortly.
              You can close this window.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-forest-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        {/* Header */}
        <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> Identity Verification Required
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">Upload Your Identity Card</h2>
          <p className="mt-1 text-sm text-white/80">
            Our compliance team has requested an updated copy of your identity card to continue.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-5 p-7">
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-foreground">
            <p className="font-semibold text-primary">What we need</p>
            <ul className="mt-1.5 space-y-1 text-muted-foreground">
              <li>• A clear photo of the <strong>front</strong> of your government-issued ID or card</li>
              <li>• A clear photo of the <strong>back</strong> of your card</li>
              <li>• All four corners must be visible and text must be legible</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileSlot
              label="Front of Card"
              hint="Hold the card flat, all corners visible"
              file={frontFile}
              onChange={setFrontFile}
            />
            <FileSlot
              label="Back of Card"
              hint="Ensure the signature strip is visible"
              file={backFile}
              onChange={setBackFile}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || !frontFile || !backFile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4" /> Submit Documents</>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Your documents are encrypted and stored securely. They are only accessible to Seedin compliance staff.
          </p>
        </div>
      </div>
    </div>
  );
}
