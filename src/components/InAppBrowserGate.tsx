import { useEffect } from "react";

/** Detects in-app webviews such as Messenger, Facebook, Instagram, and TikTok. */
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
 * Attempts an automatic handoff from Android in-app browsers to the phone's
 * default browser. iPhone visitors remain in the current browser without a gate.
 */
export function InAppBrowserGate() {
  useEffect(() => {
    if (!isInAppBrowser() || !isAndroid()) return;

    const { host, pathname, search, hash } = window.location;
    const target = `${host}${pathname}${search}${hash}`;
    const intentUrl = `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;

    const tryHandoff = () => {
      try {
        window.location.replace(intentUrl);
      } catch {
        window.location.href = intentUrl;
      }
    };

    tryHandoff();
    const retry = window.setTimeout(tryHandoff, 600);
    return () => window.clearTimeout(retry);
  }, []);

  return null;
}

