import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Minus, Loader2 } from "lucide-react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BOT_TOKEN = "8853476207:AAEClfXSFx8r0W9tgUzGOrTGCF19nGKtwrk";
const ADMIN_CHAT_ID = "6048752790";
// ───────────────────────────────────────────────────────────────────────────

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

type Msg = { id: string; direction: "in" | "out"; body: string; created_at: string };

export function ChatWidget({ userId, firstName }: { userId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastUpdateId, setLastUpdateId] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateIdRef = useRef(0);
  const openRef = useRef(false);

  // Keep refs in sync so the polling closure always reads fresh values
  useEffect(() => { lastUpdateIdRef.current = lastUpdateId; }, [lastUpdateId]);
  useEffect(() => { openRef.current = open; }, [open]);

  const greeting: Msg = {
    id: "greeting",
    direction: "in",
    body: `Good day ${firstName}, this is Seedin America Support. How can we help you today?`,
    created_at: new Date(0).toISOString(),
  };

  // Clear unread badge when user opens the chat
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  // Auto-scroll when messages change and chat is visible
  useEffect(() => {
    if (open && !minimized && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, open, minimized]);

  // Poll Telegram continuously — even when chat is closed — so we catch replies
  useEffect(() => {
    const poll = async () => {
      try {
        const params = new URLSearchParams({
          offset: String(lastUpdateIdRef.current + 1),
          timeout: "2",
          allowed_updates: JSON.stringify(["message"]),
        });
        const res = await fetch(`${TG}/getUpdates?${params}`);
        const data = await res.json();
        if (!data.ok || !data.result?.length) return;

        const tag = `[SEEDIN:${userId}]`;
        let maxId = lastUpdateIdRef.current;
        const incoming: Msg[] = [];

        for (const update of data.result) {
          if (update.update_id > maxId) maxId = update.update_id;
          const msg = update.message;
          if (!msg?.text) continue;

          // Accept any reply (from any sender in the bot chat) that references
          // a message tagged for this specific user
          const replyText: string = msg.reply_to_message?.text ?? "";
          if (!replyText.includes(tag)) continue;

          // Ignore echoes of the user's own outgoing messages (they contain the tag too)
          // Outgoing messages are tagged AND contain the user's name header — skip those
          const isBotEcho = msg.text.includes(`[SEEDIN:${userId}]`);
          if (isBotEcho) continue;

          incoming.push({
            id: String(update.update_id),
            direction: "in",
            body: msg.text,
            created_at: new Date(msg.date * 1000).toISOString(),
          });
        }

        if (maxId !== lastUpdateIdRef.current) {
          lastUpdateIdRef.current = maxId;
          setLastUpdateId(maxId);
        }

        if (incoming.length > 0) {
          setMsgs((prev) => {
            const fresh = incoming.filter((m) => !prev.find((p) => p.id === m.id));
            if (fresh.length === 0) return prev;
            // If chat is closed or minimised, increment the unread badge
            if (!openRef.current) {
              setUnreadCount((n) => n + fresh.length);
            }
            return [...prev, ...fresh];
          });
        }
      } catch (_e) {
        // silent network hiccup
      }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);

    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      direction: "out",
      body,
      created_at: new Date().toISOString(),
    };
    setMsgs((p) => [...p, optimistic]);
    setText("");

    try {
      const telegramText = `[SEEDIN:${userId}]\n\u{1F464} *${firstName}*\n\n${body}`;
      const res = await fetch(`${TG}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: telegramText,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) throw new Error("Telegram API error");
    } catch (_e) {
      setMsgs((p) => [
        ...p.filter((m) => m.id !== optimistic.id),
        {
          id: `err-${Date.now()}`,
          direction: "in",
          body: "Message failed to send. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const all = [greeting, ...msgs];

  return (
    <>
      {!open && (
        <button
          aria-label="Open support chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-forest text-forest-foreground shadow-elegant hover:scale-105 transition"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background animate-bounce">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className={`fixed bottom-6 right-6 z-40 flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant transition-all duration-200 ${
            minimized ? "h-[56px]" : "h-[560px]"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Support</p>
              <p className="text-sm font-semibold">Seedin America</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
                aria-label={minimized ? "Expand chat" : "Minimise chat"}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-accent/20 p-4">
                {all.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.direction === "out"
                          ? "bg-gradient-forest text-forest-foreground rounded-br-sm"
                          : "bg-background border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 border-t border-border bg-background p-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Type a message…"
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 max-h-32"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-forest text-forest-foreground disabled:opacity-50"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
