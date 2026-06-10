import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/brand/Logo";
import { listMyNotifications, markAllRead, savePushSubscription } from "@/lib/notifications.functions";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Seedin America" },
      { name: "description", content: "Your notifications." },
    ],
  }),
  component: NotificationsPage,
});

type N = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function NotificationsPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listMyNotifications);
  const doMarkAllRead = useServerFn(markAllRead);
  const saveSub = useServerFn(savePushSubscription);

  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const refresh = async () => {
    try {
      const r = await fetchList();
      setItems(r.notifications as N[]);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/signin" }); return; }
      setUserId(session.user.id);

      try {
        const r = await fetchList();
        if (mounted) setItems(r.notifications as N[]);
      } catch { /* ignore */ }

      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [navigate]);

  // Realtime: append new notifications live
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif-page-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => { setItems((prev) => [payload.new as N, ...prev]); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleMarkAllRead = async () => {
    try {
      await doMarkAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      toast.success("All notifications marked as read.");
    } catch { toast.error("Couldn't mark notifications as read."); }
  };

  const markOneRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
  };

  const enablePush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications aren't supported on this browser."); return;
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
      await saveSub({ data: { endpoint: sub.endpoint, p256dh: json.keys!.p256dh!, auth: json.keys!.auth! } });
      toast.success("Notifications enabled — you'll get alerts on this device.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't enable notifications");
    }
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-10">
        {/* Heading row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-forest/10">
              <Bell className="h-5 w-5 text-forest" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Notifications</h1>
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Push permission nudge */}
        {perm !== "granted" && (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-accent/40 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Get alerts on your device</p>
              <p className="text-xs text-muted-foreground">Receive grant updates even when the site isn't open.</p>
            </div>
            <button
              onClick={enablePush}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-forest px-4 py-2 text-sm font-semibold text-forest-foreground hover:opacity-90"
            >
              {perm === "denied"
                ? <><BellOff className="h-4 w-4" /> Blocked</>
                : <><Bell className="h-4 w-4" /> Enable</>}
            </button>
          </div>
        )}

        {/* Notification list */}
        <section className="mt-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-forest" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">We'll let you know when something happens.</p>
            </div>
          ) : (
            items.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markOneRead} />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function NotificationItem({ notification: n, onRead }: { notification: N; onRead: (id: string) => void }) {
  const isUnread = !n.read_at;

  const handleClick = () => {
    if (isUnread) onRead(n.id);
    if (n.link) window.location.href = n.link;
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex cursor-pointer gap-4 rounded-2xl border p-5 transition hover:shadow-card ${
        isUnread
          ? "border-forest/30 bg-gradient-to-br from-forest/5 via-background to-transparent"
          : "border-border bg-card"
      }`}
    >
      {isUnread && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-forest" />
      )}

      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isUnread ? "bg-forest/10" : "bg-muted"}`}>
        <Bell className={`h-4 w-4 ${isUnread ? "text-forest" : "text-muted-foreground"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isUnread ? "text-foreground" : "text-foreground/80"}`}>
          {n.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
        <p className="mt-2 text-xs text-muted-foreground">{formatTimeAgo(n.created_at)}</p>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
