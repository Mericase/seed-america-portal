import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
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
  const fetchList = useServerFn(listMyNotifications);
  const markRead = useServerFn(markAllRead);
  const saveSub = useServerFn(savePushSubscription);

  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const subscribedRef = useRef(false);

  const refresh = async () => {
    try { const r = await fetchList(); setItems(r.notifications as N[]); } catch { /* ignore */ }
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`notif-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as N;
          setItems((prev) => [n, ...prev]);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(n.title, { body: n.body, icon: "/favicon.ico" }); } catch { /* */ }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unread = items.filter((i) => !i.read_at).length;

  const enablePush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications aren't supported on this browser.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result !== "granted") {
        toast.error("Notifications were not enabled.");
        return;
      }
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

  // Auto-prompt once if permission default & already opened panel
  useEffect(() => {
    if (open && perm === "default") {
      // user explicitly opened the bell - safe context to prompt
    }
  }, [open, perm]);

  const onOpen = async () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      try { await markRead(); setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); } catch { /* */ }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-forest" />
                <p className="text-sm font-semibold">Notifications</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {perm !== "granted" && (
              <div className="border-b border-border bg-accent/40 p-4">
                <p className="text-xs font-medium text-foreground">Get alerts on your phone</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Allow notifications to receive grant updates even when this site isn't open.
                </p>
                <button onClick={enablePush}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-forest px-3 py-1.5 text-xs font-semibold text-forest-foreground">
                  {perm === "denied" ? <><BellOff className="h-3.5 w-3.5" /> Blocked</> : <><Bell className="h-3.5 w-3.5" /> Enable notifications</>}
                </button>
              </div>
            )}

            <div className="max-h-[24rem] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
              ) : items.map((n) => (
                <div key={n.id} className={`border-b border-border px-4 py-3 ${!n.read_at ? "bg-forest/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {!n.read_at && <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-forest" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="border-t border-border px-4 py-2 text-right">
                <button onClick={() => markRead().then(refresh)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
