import { useEffect, useState } from "react";
import { Laptop, Monitor, ShieldCheck, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { markTier2LiveStarted } from "@/lib/admin.functions";
import { toast } from "sonner";

/** True for phones only — tablets/iPads are allowed. */
export function isMobilePhone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isTablet = /iPad|Tablet|Nexus 7|SM-T|Kindle|Silk/i.test(ua) ||
    (/Macintosh/i.test(ua) && "ontouchend" in document);
  if (isTablet) return false;
  const phone = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  return phone || (window.innerWidth < 700 && "ontouchend" in document);
}

export function Tier2LiveVerificationPrompt({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const markStarted = useServerFn(markTier2LiveStarted);

  const fetchLink = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("tier2_live_link, tier2_live_completed_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data || data.tier2_live_completed_at) return null;
    return data.tier2_live_link ?? null;
  };

  useEffect(() => {
    let active = true;
    fetchLink().then((l) => {
      if (!active) return;
      if (l) { setLink(l); setOpen(true); }
    });

    // Keep the link fresh if the admin re-issues it while the member is here
    const channel = supabase
      .channel(`tier2-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { tier2_live_link: string | null; tier2_live_completed_at: string | null };
          if (row.tier2_live_completed_at || !row.tier2_live_link) {
            setLink(null);
            setOpen(false);
          } else {
            setLink(row.tier2_live_link);
            setOpen(true);
          }
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [userId]);

  if (!open || !link) return null;

  const phone = isMobilePhone();

  const proceed = async () => {
    if (isMobilePhone()) {
      toast.error("Mobile phones are not permitted. Please sign in on a laptop, computer, tablet or iPad with a webcam.");
      return;
    }
    setBusy(true);
    try {
      // Always open the link that exists at this exact moment, not the cached one
      const fresh = await fetchLink();
      if (!fresh) {
        setLink(null);
        setOpen(false);
        toast.error("This verification session is no longer active. Our team will send you a new link shortly.");
        return;
      }
      setLink(fresh);
      // Open synchronously-ish to avoid popup blockers, then notify admin
      const win = window.open(fresh, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error("Please allow pop-ups, then tap Proceed again.");
        return;
      }
      markStarted({}).catch(() => null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="bg-gradient-primary px-7 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> Urgent — Action Required
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">Final Tier 2 live verification</h2>
          <p className="mt-1 text-sm text-white/80">
            Your documents were approved. One last live identity session is required — Tier 2 activates once our team confirms your session.
          </p>
        </div>

        <div className="space-y-4 p-7">
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-foreground">
            <p className="font-semibold">This step can only be completed on:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Laptop className="h-4 w-4 text-forest" /> A laptop with a webcam</li>
              <li className="flex items-center gap-2"><Monitor className="h-4 w-4 text-forest" /> A desktop computer with a webcam</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-forest" /> A tablet or iPad</li>
              <li className="flex items-center gap-2 text-destructive"><Smartphone className="h-4 w-4" /> Mobile phones are <strong className="mx-1">not allowed</strong></li>
            </ul>
          </div>

          {phone ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              We've detected you're on a mobile phone. Please sign in again on a laptop, computer, tablet or iPad to continue.
            </p>
          ) : null}

          <button
            onClick={proceed}
            disabled={phone || busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant transition disabled:cursor-not-allowed disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {busy ? "Fetching your secure link…" : "Proceed to live verification"}

          </button>
          <button onClick={() => setOpen(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
