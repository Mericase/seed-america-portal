/**
 * src/routes/notifications.tsx
 * Fetches directly from Supabase client — no server function needed.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BellOff, BellRing, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { savePushSubscription } from "@/lib/notifications.functions";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — Seedin America" }],
  }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  title: string;
  body: string;
  link?: string;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationsPage() {
  const doSavePush = useServerFn(savePushSubscription);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingRead, setMarkingRead]     = useState(false);
  const [userId, setUserId]               = useState<string | null>(null);
  const [pushState, setPushState]         = useState<"unknown" | "granted" | "denied" | "enabling">("unknown");

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── load notifications directly from Supabase client ────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        toast.error("Could not load notifications");
      } else {
        setNotifications(data ?? []);
      }
      setLoading(false);
    });

    if ("Notification" in window) {
      setPushState(Notification.permission as any);
    }
  }, []);

  // ── real-time: new notifications appear instantly ────────────────────────
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── mark all read ────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (!userId) return;
    setMarkingRead(true);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
    setMarkingRead(false);
  };

  // ── mark one read ────────────────────────────────────────────────────────
  const handleMarkOneRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  };

  // ── enable push — ONLY when user explicitly taps the button ─────────────
  const handleEnablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }
    setPushState("enabling");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushState("denied");
      toast.error("Permission denied. Enable notifications in your browser settings.");
      return;
    }
    setPushState("granted");
    try {
      const reg = await navigator.serviceWorker.ready;
      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC_KEY) { toast.success("Push notifications enabled!"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const { endpoint, keys } = sub.toJSON() as any;
      await doSavePush({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
      toast.success("Push notifications enabled!");
    } catch (e) {
      console.error("[push] subscribe error", e);
      toast.error("Could not register push subscription.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingRead}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {markingRead
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCheck className="h-4 w-4" />}
              Mark all read
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* ── Page title ────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Notifications</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {loading ? "Loading…" : unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>

          {/* Push toggle — only shown when not yet granted */}
          {"Notification" in window && pushState !== "granted" && (
            <button
              onClick={handleEnablePush}
              disabled={pushState === "enabling" || pushState === "denied"}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pushState === "enabling" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushState === "denied" ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {pushState === "denied"
                ? "Blocked in browser"
                : pushState === "enabling"
                ? "Enabling…"
                : "Enable notifications"}
            </button>
          )}
        </div>

        {/* ── List ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={() => { if (!n.read_at) handleMarkOneRead(n.id); }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NotificationRow({
  notification: n,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isUnread = !n.read_at;

  const handleOpen = () => {
    setOpen(true);
    onRead();
  };

  const row = (
    <div
      onClick={handleOpen}
      className={`group relative cursor-pointer rounded-xl border p-4 transition ${
        isUnread
          ? "border-forest/30 bg-forest/5 hover:bg-forest/10"
          : "border-border bg-card hover:bg-accent/50"
      }`}
    >
      {isUnread && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-forest" />
      )}
      <div className="flex items-start gap-3 pr-4">
        <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isUnread ? "bg-forest/15 text-forest" : "bg-muted text-muted-foreground"
        }`}>
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${
            isUnread ? "text-foreground" : "text-muted-foreground"
          }`}>
            {n.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {n.body}
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">{timeAgo(n.created_at)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {n.link && n.link !== "/dashboard" ? (
        <Link to={n.link} onClick={handleOpen}>{row}</Link>
      ) : (
        row
      )}

      {open && (
        <NotificationDetail
          notification={n}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NotificationDetail({
  notification: n,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent background scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      {/* Dim layer */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile hint) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-snug text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(n.created_at)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6" />

        {/* Body — scrollable for long content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{n.body}</p>
        </div>

        {/* Footer CTA — only when there's a meaningful link */}
        {n.link && n.link !== "/dashboard" && (
          <>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 py-4">
              <Link
                to={n.link}
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-white transition hover:bg-forest/90"
              >
                View details
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
