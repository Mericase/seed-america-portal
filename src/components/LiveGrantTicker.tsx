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
  const [winner, setWinner] = useState(() => makeWinner());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous stream: as soon as one message finishes scrolling out,
  // the next winner comes in after at most a 2s beat.
  const handleIterationEnd = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setWinner(makeWinner()), 500 + Math.random() * 1500);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const message = useMemo(
    () =>
      `🎉 Congratulations ${winner.name} (${winner.state}) — approved for a $${winner.amount.toLocaleString("en-US")} ${winner.category} grant. 🌱 Your seed can be next.`,
    [winner],
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-forest/10 via-gold/10 to-transparent shadow-card"
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
          <div
            key={winner.id}
            onAnimationIteration={handleIterationEnd}
            className="animate-marquee whitespace-nowrap text-sm font-medium text-foreground/90"
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}

