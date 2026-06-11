/**
 * NotificationBell.tsx
 *
 * Drop-in replacement for wherever your existing bell icon lives.
 * - Clicking the bell navigates to /notifications (no dropdown, no push prompt)
 * - Shakes + shows red badge when there are unread notifications
 * - Subscribes to real-time Supabase changes so the badge updates live
 * - Push permission is ONLY requested when the user explicitly clicks
 *   "Enable notifications" on the /notifications page
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications } from "@/lib/notifications.functions";

export function NotificationBell() {
  const navigate = useNavigate();
  const fetchNotifications = useServerFn(listMyNotifications);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchNotifications().then(({ notifications }) => {
      if (cancelled) return;
      setUnreadCount(notifications.filter((n: any) => !n.read_at).length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── real-time: increment badge when a new notification arrives ─────────────
  useEffect(() => {
    const channel = supabase
      .channel("bell-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => setUnreadCount((c) => c + 1),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          // When read_at is set, decrement
          if (payload.new?.read_at && !payload.old?.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={() => navigate({ to: "/notifications" })}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
      className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
    >
      {/* Bell icon — shakes when unread */}
      <Bell
        className={`h-5 w-5 transition-transform ${hasUnread ? "animate-bell-shake" : ""}`}
      />

      {/* Red badge */}
      {hasUnread && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
