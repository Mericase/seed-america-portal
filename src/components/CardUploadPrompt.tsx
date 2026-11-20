/**
 * CardUploadPrompt.tsx
 * Full-screen modal shown to a member when an admin has requested a card upload.
 * Mirrors Tier2LiveVerificationPrompt exactly — covers the whole screen on login,
 * no way to escape. "Proceed" navigates to /card-upload where the actual upload
 * happens, then the member is returned to /dashboard.
 *
 * Usage in dashboard.tsx (already added):
 *   import { CardUploadPrompt } from "@/components/CardUploadPrompt";
 *   ...
 *   <CardUploadPrompt userId={profile.id} />
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CardUploadRow = {
  card_upload_requested: boolean;
  card_upload_submitted_at: string | null;
};

export function CardUploadPrompt({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const checkFlag = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("card_upload_requested, card_upload_submitted_at")
        .eq("id", userId)
        .maybeSingle<CardUploadRow>();
      if (!active) return;
      // Show modal only when requested AND not yet submitted
      if (data?.card_upload_requested && !data.card_upload_submitted_at) {
        setOpen(true);
      }
    };

    checkFlag();

    // Realtime: show immediately if admin triggers while member is logged in
    const channel = supabase
      .channel(`card-upload-prompt-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as CardUploadRow;
          if (row.card_upload_requested && !row.card_upload_submitted_at) {
            setOpen(true);
          } else {
            // Admin cleared the request or member submitted — dismiss
            setOpen(false);
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

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">

        {/* Header — same gradient as Tier2LiveVerificationPrompt */}
        <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> Urgent — Action Required
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Identity Card Upload Required
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Our compliance team needs an updated copy of your identity card to keep your account active.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-5 p-7">

          {/* Why it's necessary */}
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <p className="font-semibold text-foreground">Why this is required</p>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              As part of our ongoing identity verification process, we are required to hold
              a current copy of your government-issued ID on file. This is a standard compliance
              step and <strong className="text-foreground">does not affect your balance or any pending applications</strong>.
            </p>
          </div>

          {/* Trust points */}
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <Lock className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                Your documents are <strong className="text-foreground">encrypted and stored securely</strong> —
                accessible only to Seedin compliance staff.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <CreditCard className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                <strong className="text-foreground">No charges will ever be made without your full knowledge and consent.</strong>{" "}
                This is a verification step only.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <ShieldCheck className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                Completing this step ensures your account remains in good standing and{" "}
                <strong className="text-foreground">grants continue without interruption</strong>.
              </span>
            </li>
          </ul>

          {/* CTA — no dismiss option */}
          <button
            onClick={() => {
              setOpen(false);
              navigate({ to: "/card-upload" });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
          >
            Proceed to Upload
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-xs text-muted-foreground">
            This step is compulsory. You will be redirected back to your dashboard once complete.
          </p>
        </div>
      </div>
    </div>
  );
}
