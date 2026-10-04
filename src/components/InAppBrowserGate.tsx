import { useEffect, useState } from "react";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/** Detects in-app webviews (Messenger, Facebook, Instagram, TikTok...) that
 *  kill the tab when the user switches apps and break uploads. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|TikTok|Snapchat|Line\//i.test(
    navigator.userAgent,
  );
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/**
 * Site-wide gate: when the page is opened inside an in-app browser, Android
 * users are bounced straight into their phone's DEFAULT browser via an intent
 * URL (no package specified, so the system resolves the default). iOS webviews
 * cannot be force-exited by any website — those users get a blocking screen.
 */
export function InAppBrowserGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!isInAppBrowser()) return;

    if (isAndroid()) {
      const { host, pathname, search, hash } = window.location;
      const target = `${host}${pathname}${search}${hash}`;
      // No `package=` — Android resolves this with the user's default browser.
      const intentUrl = `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;

      const tryHandoff = () => {
        try {
          window.location.replace(intentUrl);
        } catch {
          window.location.href = intentUrl;
        }
      };

      // Fire immediately, and retry once shortly after in case the first
      // attempt was swallowed while the webview was still settling.
      tryHandoff();
      const retry = setTimeout(tryHandoff, 600);

      // If the intent didn't hand off (blocked webview), show the fallback.
      const fallback = setTimeout(() => setBlocked(true), 2500);
      return () => {
        clearTimeout(retry);
        clearTimeout(fallback);
      };
    }

    // iOS / other: no website can force-exit an in-app webview here.
    setBlocked(true);
  }, []);

  if (!blocked) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied — paste it into Safari or Chrome");
    } catch {
      toast.error("Could not copy the link. Long-press the address bar to copy it.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-elegant">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
          <ExternalLink className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">
          One quick step: open in your browser
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This app opened the page in its own built-in viewer, which can't handle
          secure sign-up and document uploads. Your phone's browser is required.
        </p>

        <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-left text-sm text-foreground">
          <p className="font-semibold">It takes 5 seconds:</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Tap the <strong className="text-foreground">⋯</strong> or <strong className="text-foreground">⋮</strong> menu at the top of this screen.</li>
            <li>Tap <strong className="text-foreground">"Open in browser"</strong> (or "Open in Safari").</li>
          </ol>
        </div>

        <button
          type="button"
          onClick={copyLink}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant transition hover:opacity-90"
        >
          <Copy className="h-4 w-4" /> Copy page link
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-forest" />
          Your progress is saved — you'll continue right where you left off.
        </p>
      </div>
    </div>
  );
}
