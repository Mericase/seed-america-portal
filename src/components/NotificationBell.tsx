/**
 * src/components/NotificationBell.tsx
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications } from "@/lib/notifications.functions";

interface Props {
  userId: string;
}

export function NotificationBell({ userId }: Props) {
  const navigate = useNavigate();
  const fetchNotifications = useServerFn(listMyNotifications);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then(({ notifications }) => {
        if (cancelled) return;
        setUnreadCount(notifications.filter((n: any) => !n.read_at).length);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // ── real-time updates filtered to this user ──────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => setUnreadCount((c) => c + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new?.read_at && !payload.old?.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={() => navigate({ to: "/notifications" })}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
      className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
    >
      <Bell className={`h-5 w-5 transition-transform ${hasUnread ? "animate-bell-shake" : ""}`} />

      {hasUnread && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
