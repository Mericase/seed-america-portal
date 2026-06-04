import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./vapid";

const VAPID_PRIVATE_KEY = "HKqP7JPUEBPKCDwUq4QcbfsxcramhbGsNulB5Vnu6_s";
const VAPID_SUBJECT = "mailto:notifications@seedinamerica.gov";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

export async function sendWebPush(sub: PushSub, payload: { title: string; body: string; link?: string }) {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true as const };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    return { ok: false as const, status, gone: status === 404 || status === 410 };
  }
}
