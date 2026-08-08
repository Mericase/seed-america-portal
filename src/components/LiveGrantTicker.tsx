import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

// ─── Name pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  // Male
  "James", "Michael", "Robert", "John", "David", "William", "Richard", "Joseph",
  "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Steven",
  "Brandon", "Tyler", "Justin", "Kevin", "Brian", "Eric", "Gregory", "Samuel",
  "Ryan", "Nathan", "Jacob", "Logan", "Ethan", "Joshua", "Andrew", "Patrick",
  "Kyle", "Aaron", "Adam", "Sean", "Timothy", "Scott", "Walter", "Zachary",
  "Dennis", "Jeffrey", "Frank", "Harold", "Raymond", "Lawrence", "Dylan", "Austin",
  "Jordan", "Marcus", "Derrick", "Darnell", "Curtis", "Terrence", "Malik", "Jamal",
  "Xavier", "Elijah", "Isaiah", "DeShawn", "Marquis", "Dwayne", "Cedric", "Reginald",
  "Carlos", "Luis", "Miguel", "Juan", "Antonio", "Eduardo", "Ricardo", "Mario",
  "Victor", "Alex", "Fernando", "Diego", "Rafael", "Omar", "Ivan", "Jesus",
  "Hector", "Andres", "Alejandro", "Roberto", "Sergio", "Ruben", "Cesar", "Ernesto",
  // Female
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
  "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Ashley", "Amanda", "Melissa",
  "Danielle", "Rachel", "Heather", "Angela", "Nicole", "Katherine", "Megan",
  "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Dorothy", "Amy", "Anna",
  "Ruth", "Deborah", "Carolyn", "Janet", "Maria", "Diane", "Christine", "Samantha",
  "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Abigail",
  "Brittany", "Amber", "Crystal", "Tiffany", "Latasha", "Keisha", "Tamika", "Shonda",
  "Aaliyah", "Destiny", "Jasmine", "Monique", "Shanice", "Tanesha", "Yolanda", "Vanessa",
  "Gloria", "Rosa", "Elena", "Gabriela", "Adriana", "Veronica", "Marisol", "Esperanza",
  "Leticia", "Alicia", "Sandra", "Diana", "Claudia", "Luz", "Blanca", "Margarita",
  "Selena", "Brenda", "Norma", "Irma", "Alma", "Carmen", "Graciela", "Guadalupe",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
  "Mitchell", "Carter", "Roberts", "Turner", "Phillips", "Evans", "Edwards", "Collins",
  "Stewart", "Morris", "Murphy", "Cook", "Rogers", "Morgan", "Peterson", "Cooper",
  "Reed", "Bailey", "Bell", "Gomez", "Kelly", "Howard", "Ward", "Cox",
  "Diaz", "Richardson", "Wood", "Watson", "Brooks", "Bennett", "Gray", "James",
  "Reyes", "Cruz", "Hughes", "Price", "Myers", "Long", "Foster", "Sanders",
  "Ross", "Morales", "Powell", "Sullivan", "Russell", "Ortiz", "Jenkins", "Gutierrez",
  "Perry", "Butler", "Barnes", "Fisher", "Henderson", "Coleman", "Simmons", "Patterson",
  "Jordan", "Reynolds", "Hamilton", "Graham", "Kim", "Gonzales", "Alexander", "Ramos",
  "Washington", "Jefferson", "Freeman", "Owens", "Dixon", "Douglas", "Warren", "Bryant",
  "Franklin", "Hawkins", "Griffin", "West", "Ford", "Chapman", "Lawrence", "Cunningham",
  "Webb", "George", "Mckinney", "Barnett", "Payne", "Hicks", "Little", "Tran",
  "Bishop", "Carr", "Bates", "Fields", "Lloyd", "Stone", "Dunn", "Bowman",
];

const CATEGORIES: { label: string; min: number; max: number; weight: number }[] = [
  { label: "credit card debt relief",      min: 3000,  max: 12000, weight: 10 },
  { label: "utility & rent relief",        min: 1500,  max: 6000,  weight: 10 },
  { label: "childcare support",            min: 2000,  max: 8000,  weight: 8  },
  { label: "car repair & transportation",  min: 2000,  max: 7500,  weight: 8  },
  { label: "family emergency",             min: 2500,  max: 10000, weight: 8  },
  { label: "home repair",                  min: 5000,  max: 20000, weight: 7  },
  { label: "medical expenses",             min: 5000,  max: 30000, weight: 7  },
  { label: "student loan repayment",       min: 8000,  max: 25000, weight: 7  },
  { label: "small business startup",       min: 10000, max: 35000, weight: 5  },
  { label: "accident relief",              min: 7500,  max: 30000, weight: 5  },
  { label: "mortgage relief",              min: 12000, max: 45000, weight: 3  },
  { label: "disability & long-term care",  min: 15000, max: 60000, weight: 1  },
];

const STATES = [
  "TX", "OH", "FL", "GA", "CA", "NC", "MI", "AZ", "PA", "TN", "IL", "MO",
  "NY", "IN", "WI", "VA", "AL", "SC", "KY", "OK", "WA", "NJ", "MN", "LA",
  "CO", "MD", "OR", "NV", "UT", "AR", "MS", "KS", "NM", "NE", "WV", "ID",
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

function makeMessage(): string {
  const cat = pickCategory();
  const skew = Math.random() < 0.85 ? Math.random() ** 1.8 : Math.random();
  const raw = cat.min + skew * (cat.max - cat.min);
  const step = raw < 10000 ? 250 : raw < 25000 ? 500 : 1000;
  const amount = Math.max(cat.min, Math.round(raw / step) * step);
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const state = pick(STATES);
  return `🎉 Congratulations ${name} (${state}) — approved for a $${amount.toLocaleString("en-US")} ${cat.label} grant.   🌱 Your seed can be next.`;
}

// ─── Tuning knobs ─────────────────────────────────────────────────────────────
const SPEED = 95; // px/s — single value to tune overall speed
const GAP   = 96; // px of space between end of one message and start of next

// ─── Component ────────────────────────────────────────────────────────────────
//
// Strategy: render a flat list of <span> nodes. We track an array of
// { text, domIndex } in a ref so the rAF loop can:
//   1. move the track left by SPEED * dt each frame
//   2. when the leftmost span scrolls fully off-screen (pos > its right edge),
//      pop it from the front, append a fresh message to the back, and subtract
//      its width+GAP from pos so the animation position stays correct.
//
// React state is only touched to update span text — never to change the count
// or order of DOM nodes — so refs stay stable forever.
//
const SLOT_COUNT = 3; // how many spans we keep in the DOM at once

export function LiveGrantTicker() {
  // Initialise slots with unique messages
  const [slots, setSlots] = useState<string[]>(() =>
    Array.from({ length: SLOT_COUNT }, makeMessage),
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // All mutable animation state lives here — never causes re-renders
  const raf    = useRef<number | null>(null);
  const pos    = useRef(0);    // current translateX (px, always positive = scroll left)
  const prevTs = useRef(0);
  // head is the index into spanRefs of the "first" visible span.
  // We rotate this mod SLOT_COUNT instead of reordering DOM nodes.
  const head   = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = prevTs.current ? (ts - prevTs.current) / 1000 : 0;
      prevTs.current = ts;

      pos.current += dt * SPEED;

      const track = trackRef.current;
      if (track) {
        // Measure the leading span (head)
        const leadSpan = spanRefs.current[head.current];
        if (leadSpan) {
          const leadWidth = leadSpan.offsetWidth + GAP;
          // Has the leading span fully scrolled off the left edge?
          if (pos.current >= leadWidth) {
            pos.current -= leadWidth;
            // Recycle this span: give it new content and it becomes the tail
            const tailIndex = head.current;
            head.current = (head.current + 1) % SLOT_COUNT;
            // Update only the recycled span's text via React state
            setSlots(prev => {
              const next = [...prev];
              next[tailIndex] = makeMessage();
              return next;
            });
          }
        }

        // Build the CSS transform.
        // The spans are rendered in DOM order 0,1,2,... but our logical order
        // starts at head. We need to offset by the cumulative width of spans
        // that are logically "before" head but sitting after it in the DOM.
        // The simplest correct approach: translate by -pos, but also account for
        // the widths of spans that have been "moved to the back" of our logical queue.
        // Because we never reorder DOM nodes, we need a visual offset so that
        // span[head] appears first. We compute this as the sum of widths of spans
        // with DOM index < head (they are logically at the tail).
        let headOffset = 0;
        for (let i = 0; i < head.current; i++) {
          const s = spanRefs.current[i];
          if (s) headOffset += s.offsetWidth + GAP;
        }

        // Total track width (all spans)
        let totalWidth = 0;
        for (let i = 0; i < SLOT_COUNT; i++) {
          const s = spanRefs.current[i];
          if (s) totalWidth += s.offsetWidth + GAP;
        }

        // The translate we apply = -(headOffset + pos) mod totalWidth
        // This wraps the track so it loops seamlessly.
        let translate = headOffset + pos.current;
        // Keep translate within [0, totalWidth) to avoid drifting forever
        if (totalWidth > 0) translate = ((translate % totalWidth) + totalWidth) % totalWidth;

        track.style.transform = `translateX(-${translate}px)`;
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []); // runs once — loop reads all state via refs

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-forest/10 via-gold/10 to-transparent shadow-card"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* LIVE badge */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-forest px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
          </span>
          Live
        </span>

        <PartyPopper className="h-4 w-4 shrink-0 text-gold" />

        {/* Scrolling viewport */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex will-change-transform"
            style={{ whiteSpace: "nowrap" }}
          >
            {slots.map((text, i) => (
              <span
                key={i} // stable key = stable DOM node = stable ref
                ref={el => { spanRefs.current[i] = el; }}
                className="text-sm font-medium text-foreground/90"
                style={{ paddingRight: GAP, display: "inline-block", whiteSpace: "nowrap" }}
              >
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
