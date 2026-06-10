import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications, markAllRead, savePushSubscription } from "@/lib/notifications.functions";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type N = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationBell({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const fetchList = useServerFn(listMyNotifications);
  const markRead = useServerFn(markAllRead);
  const saveSub = useServerFn(savePushSubscription);
  const subscribedRef = useRef(false);

  const [unread, setUnread] = useState(0);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const refreshUnread = async () => {
    try {
      const r = await fetchList();
      const items = r.notifications as N[];
      setUnread(items.filter((i) => !i.read_at).length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refreshUnread();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as N;
          setUnread((prev) => prev + 1);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(n.title, { body: n.body, icon: "/favicon.ico" }); } catch { /* */ }
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Check if already subscribed on mount
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      perm !== "default" ||
      subscribedRef.current
    ) return;

    const checkExisting = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) { subscribedRef.current = true; setPerm("granted"); }
      } catch { /* ignore */ }
    };
    checkExisting();
  }, [perm]);

  const enablePush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications aren't supported on this browser.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result !== "granted") { toast.error("Notifications were not enabled."); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      await saveSub({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });
      subscribedRef.current = true;
      toast.success("Notifications enabled — you'll get alerts on this device.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't enable notifications");
    }
  };

  const handleClick = async () => {
    // Opportunistically prompt for push permission if not yet decided
    if (perm === "default") enablePush();
    navigate({ to: "/notifications" });
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
