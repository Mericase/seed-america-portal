import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listSupportMessages, sendSupportMessage } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { id: string; direction: "in" | "out"; body: string; created_at: string };

export function ChatWidget({ userId, firstName }: { userId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const list = useServerFn(listSupportMessages);
  const send = useServerFn(sendSupportMessage);

  const greeting: Msg = {
    id: "greeting",
    direction: "in",
    body: `Good day ${firstName}, this is Seedin America Support. How can we help you today?`,
    created_at: new Date(0).toISOString(),
  };

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    list()
      .then((r) => mounted && setMsgs(r.messages as Msg[]))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [open, list]);

  // Realtime: receive admin replies
  useEffect(() => {
    const channel = supabase
      .channel(`support:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, open]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`, direction: "out", body, created_at: new Date().toISOString(),
    };
    setMsgs((p) => [...p, optimistic]);
    setText("");
    try {
      const r = await send({ data: { body } });
      setMsgs((p) => p.map((m) => (m.id === optimistic.id ? { ...m, id: r.id, created_at: r.created_at } : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
      setMsgs((p) => p.filter((m) => m.id !== optimistic.id));
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
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="flex items-center justify-between bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Support</p>
              <p className="text-sm font-semibold">Seedin America</p>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-accent/20 p-4">
            {loading && msgs.length === 0 && (
              <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-forest" /></div>
            )}
            {all.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
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
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
