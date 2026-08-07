import { useEffect, useMemo, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

const FIRST_NAMES = [
  "James", "Michael", "Robert", "John", "David", "William", "Richard", "Joseph",
  "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Steven",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
  "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Ashley", "Amanda", "Melissa",
  "Brandon", "Tyler", "Justin", "Kevin", "Brian", "Eric", "Gregory", "Samuel",
  "Danielle", "Rachel", "Heather", "Angela", "Nicole", "Katherine", "Megan",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
];

// Realistic per-category ranges (min, max, weight). Weight favours smaller awards.
const CATEGORIES: { label: string; min: number; max: number; weight: number }[] = [
  { label: "credit card debt relief", min: 3000, max: 12000, weight: 10 },
  { label: "utility & rent relief", min: 1500, max: 6000, weight: 10 },
  { label: "childcare support", min: 2000, max: 8000, weight: 8 },
  { label: "car repair & transportation", min: 2000, max: 7500, weight: 8 },
  { label: "family emergency", min: 2500, max: 10000, weight: 8 },
  { label: "home repair", min: 5000, max: 20000, weight: 7 },
  { label: "medical expenses", min: 5000, max: 30000, weight: 7 },
  { label: "student loan repayment", min: 8000, max: 25000, weight: 7 },
  { label: "small business startup", min: 10000, max: 35000, weight: 5 },
  { label: "accident relief", min: 7500, max: 30000, weight: 5 },
  { label: "mortgage relief", min: 12000, max: 45000, weight: 3 },
  { label: "disability & long-term care", min: 15000, max: 60000, weight: 1 },
];
const STATES = [
  "TX", "OH", "FL", "GA", "CA", "NC", "MI", "AZ", "PA", "TN", "IL", "MO",
  "NY", "IN", "WI", "VA", "AL", "SC", "KY", "OK", "WA", "NJ", "MN", "LA",
];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickCategory() {
  const total = CATEGORIES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CATEGORIES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CATEGORIES[0];
}

function makeWinner() {
  const category = pickCategory();
  // Bias towards the lower half of each range; occasionally reach the top.
  const skew = Math.random() < 0.85 ? Math.random() ** 1.8 : Math.random();
  const raw = category.min + skew * (category.max - category.min);
  const step = raw < 10000 ? 250 : raw < 25000 ? 500 : 1000;
  const amount = Math.max(category.min, Math.round(raw / step) * step);
  return {
    id: Math.random().toString(36).slice(2),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    state: pick(STATES),
    category: category.label,
    amount,
  };
}

// Mostly short beats, sometimes a longer pause — never stops.
function nextDelay() {
  const r = Math.random();
  if (r < 0.65) return 800 + Math.random() * 1600; // 0.8–2.4s
  if (r < 0.92) return 2500 + Math.random() * 2500; // 2.5–5s
  return 5000 + Math.random() * 5000; // 5–10s, rare
}

export function LiveGrantTicker() {
  const [winner, setWinner] = useState(() => makeWinner());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous stream: as soon as one message finishes scrolling out,
  // the next winner comes in after a varied beat.
  const handleAnimationEnd = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setWinner(makeWinner()), nextDelay());
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
            onAnimationEnd={handleAnimationEnd}
            className="animate-marquee whitespace-nowrap text-sm font-medium text-foreground/90"
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}

