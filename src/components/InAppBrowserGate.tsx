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

  const continueInBrowser = async () => {
    // Best-effort handoff: some webviews honor _blank by opening externally.
    const win = window.open(window.location.href, "_blank");
    if (!win) {
      // Pop-up blocked — fall back to copying the link for manual paste.
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied — paste it into Safari's address bar");
      } catch {
        toast.error('Tap the ⋯ menu at the top and choose "Open in Safari".');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      {/* iOS-style alert card */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-card text-center shadow-elegant">
        <div className="px-6 pb-5 pt-7">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
            <ExternalLink className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Continue in Safari
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Secure sign-up and document uploads require your phone's browser.
            Continue in Safari to keep going — your progress is saved and you'll
            pick up right where you left off.
          </p>
        </div>

        <button
          type="button"
          onClick={continueInBrowser}
          className="w-full border-t border-border py-3.5 text-base font-semibold text-[#007AFF] transition active:bg-muted"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => toast('Tap the ⋯ menu at the top of this screen, then choose "Open in Safari".')}
          className="w-full border-t border-border py-3.5 text-sm text-muted-foreground transition active:bg-muted"
        >
          How do I do this manually?
        </button>

        <p className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-forest" />
          Your progress is saved automatically.
        </p>
      </div>
    </div>
  );
}
