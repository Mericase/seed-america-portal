import { useEffect, useMemo, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

const FIRST_NAMES = [
  "Jean", "Marcus", "Alicia", "David", "Rosa", "Terrance", "Emily", "Hector",
  "Danielle", "Kevin", "Maya", "Grace", "Tyler", "Nicole", "Andre", "Bethany",
  "Ruben", "Shauna", "Patrick", "Lorraine", "Omar", "Casey", "Diane", "Elijah",
];
const LAST_NAMES = [
  "Smith", "Whitfield", "Rodriguez", "Coleman", "Nguyen", "Baker", "Alvarez",
  "Hollis", "Carter", "Mitchell", "Boyd", "Reyes", "Sullivan", "Duncan",
  "Freeman", "Parker", "Osei", "Lindqvist", "Barrett", "Vaughn",
];
const CATEGORIES = [
  "medical expenses",
  "student loan repayment",
  "mortgage relief",
  "small business startup",
  "accident relief",
  "credit card debt relief",
  "home repair",
  "childcare support",
  "utility & rent relief",
  "family emergency",
];
const STATES = [
  "TX", "OH", "FL", "GA", "CA", "NC", "MI", "AZ", "PA", "TN", "IL", "MO",
];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeWinner() {
  const amount = (Math.floor(Math.random() * (70000 - 5000 + 1)) + 5000);
  const rounded = Math.round(amount / 500) * 500;
  return {
    id: Math.random().toString(36).slice(2),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    state: pick(STATES),
    category: pick(CATEGORIES),
    amount: rounded,
  };
}

export function LiveGrantTicker() {
  const [winner, setWinner] = useState<ReturnType<typeof makeWinner> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;

    const schedule = (delay: number) => {
      const t = setTimeout(() => {
        if (cancelled) return;
        setWinner(makeWinner());
        const hide = setTimeout(() => {
          if (cancelled) return;
          setWinner(null);
          schedule(12000 + Math.random() * 14000);
        }, 14000);
        timers.current.push(hide);
      }, delay);
      timers.current.push(t);
    };

    schedule(4000);
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const message = useMemo(() => {
    if (!winner) return "";
    return `🎉 Congratulations ${winner.name} (${winner.state}) — approved for a $${winner.amount.toLocaleString("en-US")} ${winner.category} grant. 🌱 Your seed can be next.`;
  }, [winner]);

  if (!winner) return null;

  return (
    <div
      key={winner.id}
      role="status"
      aria-live="polite"
      className="animate-fade-in mt-6 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-forest/10 via-gold/10 to-transparent shadow-card"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-forest px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
          </span>
          Live
        </span>
        <PartyPopper className="h-4 w-4 shrink-0 text-gold" />
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-sm font-medium text-foreground/90">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
