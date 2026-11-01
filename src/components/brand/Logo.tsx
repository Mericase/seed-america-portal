import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

// ─── Name pools ──────────────────────────────────────────────────────────────

type Recipient = { first: string; last: string; loc: string; flag: string };

const US_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "James",       last: "Smith",      loc: "TX",  flag: "🇺🇸" },
  { first: "Michael",     last: "Johnson",    loc: "FL",  flag: "🇺🇸" },
  { first: "Robert",      last: "Williams",   loc: "CA",  flag: "🇺🇸" },
  { first: "David",       last: "Brown",      loc: "NY",  flag: "🇺🇸" },
  { first: "William",     last: "Jones",      loc: "GA",  flag: "🇺🇸" },
  { first: "Richard",     last: "Davis",      loc: "OH",  flag: "🇺🇸" },
  { first: "Joseph",      last: "Miller",     loc: "PA",  flag: "🇺🇸" },
  { first: "Thomas",      last: "Wilson",     loc: "IL",  flag: "🇺🇸" },
  { first: "Christopher", last: "Moore",      loc: "AZ",  flag: "🇺🇸" },
  { first: "Daniel",      last: "Taylor",     loc: "NC",  flag: "🇺🇸" },
  { first: "Matthew",     last: "Anderson",   loc: "TN",  flag: "🇺🇸" },
  { first: "Anthony",     last: "Thomas",     loc: "MI",  flag: "🇺🇸" },
  { first: "Mark",        last: "Jackson",    loc: "MO",  flag: "🇺🇸" },
  { first: "Steven",      last: "Harris",     loc: "VA",  flag: "🇺🇸" },
  { first: "Brandon",     last: "Martin",     loc: "WA",  flag: "🇺🇸" },
  { first: "Tyler",       last: "Garcia",     loc: "NJ",  flag: "🇺🇸" },
  { first: "Justin",      last: "Martinez",   loc: "MN",  flag: "🇺🇸" },
  { first: "Kevin",       last: "Robinson",   loc: "CO",  flag: "🇺🇸" },
  { first: "Brian",       last: "Clark",      loc: "OR",  flag: "🇺🇸" },
  { first: "Eric",        last: "Rodriguez",  loc: "NV",  flag: "🇺🇸" },
  { first: "Ryan",        last: "Lewis",      loc: "IN",  flag: "🇺🇸" },
  { first: "Nathan",      last: "Lee",        loc: "WI",  flag: "🇺🇸" },
  { first: "Jacob",       last: "Walker",     loc: "AL",  flag: "🇺🇸" },
  { first: "Logan",       last: "Hall",       loc: "SC",  flag: "🇺🇸" },
  { first: "Ethan",       last: "Allen",      loc: "KY",  flag: "🇺🇸" },
  { first: "Elijah",      last: "Young",      loc: "OK",  flag: "🇺🇸" },
  { first: "Marcus",      last: "King",       loc: "LA",  flag: "🇺🇸" },
  { first: "Malik",       last: "Wright",     loc: "MD",  flag: "🇺🇸" },
  { first: "Jamal",       last: "Scott",      loc: "MS",  flag: "🇺🇸" },
  { first: "DeShawn",     last: "Green",      loc: "AR",  flag: "🇺🇸" },
  { first: "Carlos",      last: "Torres",     loc: "TX",  flag: "🇺🇸" },
  { first: "Luis",        last: "Flores",     loc: "CA",  flag: "🇺🇸" },
  { first: "Miguel",      last: "Rivera",     loc: "NM",  flag: "🇺🇸" },
  { first: "Juan",        last: "Perez",      loc: "AZ",  flag: "🇺🇸" },
  { first: "Andres",      last: "Ramirez",    loc: "FL",  flag: "🇺🇸" },
  { first: "Diego",       last: "Gutierrez",  loc: "TX",  flag: "🇺🇸" },
  // ── Female ──
  { first: "Mary",        last: "Campbell",   loc: "NC",  flag: "🇺🇸" },
  { first: "Patricia",    last: "Mitchell",   loc: "GA",  flag: "🇺🇸" },
  { first: "Jennifer",    last: "Carter",     loc: "OH",  flag: "🇺🇸" },
  { first: "Linda",       last: "Roberts",    loc: "PA",  flag: "🇺🇸" },
  { first: "Elizabeth",   last: "Turner",     loc: "IL",  flag: "🇺🇸" },
  { first: "Barbara",     last: "Phillips",   loc: "NY",  flag: "🇺🇸" },
  { first: "Susan",       last: "Evans",      loc: "VA",  flag: "🇺🇸" },
  { first: "Jessica",     last: "Edwards",    loc: "TN",  flag: "🇺🇸" },
  { first: "Sarah",       last: "Collins",    loc: "WA",  flag: "🇺🇸" },
  { first: "Karen",       last: "Stewart",    loc: "MI",  flag: "🇺🇸" },
  { first: "Ashley",      last: "Hall",       loc: "AZ",  flag: "🇺🇸" },
  { first: "Amanda",      last: "Morris",     loc: "CO",  flag: "🇺🇸" },
  { first: "Melissa",     last: "Rogers",     loc: "MN",  flag: "🇺🇸" },
  { first: "Angela",      last: "Cook",       loc: "WI",  flag: "🇺🇸" },
  { first: "Nicole",      last: "Morgan",     loc: "OR",  flag: "🇺🇸" },
  { first: "Emma",        last: "Bailey",     loc: "FL",  flag: "🇺🇸" },
  { first: "Olivia",      last: "Bell",       loc: "CA",  flag: "🇺🇸" },
  { first: "Sophia",      last: "Gomez",      loc: "TX",  flag: "🇺🇸" },
  { first: "Keisha",      last: "Howard",     loc: "GA",  flag: "🇺🇸" },
  { first: "Tamika",      last: "Ward",       loc: "SC",  flag: "🇺🇸" },
  { first: "Jasmine",     last: "Cox",        loc: "NY",  flag: "🇺🇸" },
  { first: "Vanessa",     last: "Diaz",       loc: "NJ",  flag: "🇺🇸" },
  { first: "Rosa",        last: "Reyes",      loc: "CA",  flag: "🇺🇸" },
  { first: "Elena",       last: "Cruz",       loc: "TX",  flag: "🇺🇸" },
  { first: "Gabriela",    last: "Morales",    loc: "AZ",  flag: "🇺🇸" },
  { first: "Carmen",      last: "Ortiz",      loc: "FL",  flag: "🇺🇸" },
];

const CA_RECIPIENTS: Recipient[] = [
  // ── Anglophone ──
  { first: "Liam",      last: "MacDonald",  loc: "ON",  flag: "🇨🇦" },
  { first: "Noah",      last: "Murray",     loc: "BC",  flag: "🇨🇦" },
  { first: "Ethan",     last: "Campbell",   loc: "AB",  flag: "🇨🇦" },
  { first: "Owen",      last: "Stewart",    loc: "MB",  flag: "🇨🇦" },
  { first: "Aiden",     last: "MacLeod",    loc: "NS",  flag: "🇨🇦" },
  { first: "Connor",    last: "O'Brien",    loc: "SK",  flag: "🇨🇦" },
  { first: "Declan",    last: "Murphy",     loc: "NB",  flag: "🇨🇦" },
  { first: "Callum",    last: "Armstrong",  loc: "ON",  flag: "🇨🇦" },
  { first: "Finn",      last: "Clarke",     loc: "BC",  flag: "🇨🇦" },
  { first: "Hunter",    last: "Robertson",  loc: "AB",  flag: "🇨🇦" },
  { first: "Avery",     last: "Henderson",  loc: "ON",  flag: "🇨🇦" },
  { first: "Isla",      last: "Thomson",    loc: "BC",  flag: "🇨🇦" },
  { first: "Emma",      last: "Mitchell",   loc: "AB",  flag: "🇨🇦" },
  { first: "Chloe",     last: "Hamilton",   loc: "ON",  flag: "🇨🇦" },
  { first: "Zoey",      last: "Young",      loc: "MB",  flag: "🇨🇦" },
  { first: "Abigail",   last: "Scott",      loc: "NS",  flag: "🇨🇦" },
  { first: "Hannah",    last: "Graham",     loc: "SK",  flag: "🇨🇦" },
  { first: "Natalie",   last: "Morrison",   loc: "BC",  flag: "🇨🇦" },
  // ── Francophone ──
  { first: "Jean",      last: "Tremblay",   loc: "QC",  flag: "🇨🇦" },
  { first: "Pierre",    last: "Gagnon",     loc: "QC",  flag: "🇨🇦" },
  { first: "François",  last: "Roy",        loc: "QC",  flag: "🇨🇦" },
  { first: "Marc",      last: "Côté",       loc: "QC",  flag: "🇨🇦" },
  { first: "Sébastien", last: "Bouchard",   loc: "QC",  flag: "🇨🇦" },
  { first: "Maxime",    last: "Fortin",     loc: "QC",  flag: "🇨🇦" },
  { first: "Alexandre", last: "Gauthier",   loc: "QC",  flag: "🇨🇦" },
  { first: "Chantal",   last: "Leblanc",    loc: "QC",  flag: "🇨🇦" },
  { first: "Sophie",    last: "Morin",      loc: "QC",  flag: "🇨🇦" },
  { first: "Nathalie",  last: "Lavoie",     loc: "QC",  flag: "🇨🇦" },
  { first: "Isabelle",  last: "Ouellet",    loc: "QC",  flag: "🇨🇦" },
  { first: "Mélanie",   last: "Pelletier",  loc: "QC",  flag: "🇨🇦" },
  { first: "Valérie",   last: "Bergeron",   loc: "QC",  flag: "🇨🇦" },
  // ── Mixed ──
  { first: "Dylan",     last: "Beaulieu",   loc: "ON",  flag: "🇨🇦" },
  { first: "Kayla",     last: "Fontaine",   loc: "MB",  flag: "🇨🇦" },
  { first: "Tyler",     last: "Vachon",     loc: "BC",  flag: "🇨🇦" },
  { first: "Amber",     last: "Leclerc",    loc: "AB",  flag: "🇨🇦" },
  { first: "Raj",       last: "Patel",      loc: "ON",  flag: "🇨🇦" },
  { first: "Priya",     last: "Singh",      loc: "BC",  flag: "🇨🇦" },
  { first: "Harpreet",  last: "Gill",       loc: "AB",  flag: "🇨🇦" },
  { first: "Amy",       last: "Chen",       loc: "ON",  flag: "🇨🇦" },
  { first: "Wei",       last: "Zhang",      loc: "BC",  flag: "🇨🇦" },
  { first: "Mei",       last: "Liu",        loc: "ON",  flag: "🇨🇦" },
];

const AU_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "Lachlan",   last: "Smith",      loc: "NSW", flag: "🇦🇺" },
  { first: "Hamish",    last: "Jones",      loc: "VIC", flag: "🇦🇺" },
  { first: "Angus",     last: "Williams",   loc: "QLD", flag: "🇦🇺" },
  { first: "Fraser",    last: "Brown",      loc: "WA",  flag: "🇦🇺" },
  { first: "Callum",    last: "Taylor",     loc: "SA",  flag: "🇦🇺" },
  { first: "Flynn",     last: "Wilson",     loc: "NSW", flag: "🇦🇺" },
  { first: "Brody",     last: "Johnson",    loc: "QLD", flag: "🇦🇺" },
  { first: "Cooper",    last: "Anderson",   loc: "VIC", flag: "🇦🇺" },
  { first: "Remy",      last: "Thomas",     loc: "NSW", flag: "🇦🇺" },
  { first: "Blake",     last: "O'Brien",    loc: "QLD", flag: "🇦🇺" },
  { first: "Declan",    last: "Murphy",     loc: "VIC", flag: "🇦🇺" },
  { first: "Jake",      last: "Morrison",   loc: "WA",  flag: "🇦🇺" },
  { first: "Dylan",     last: "Martin",     loc: "NSW", flag: "🇦🇺" },
  { first: "Brendan",   last: "Clarke",     loc: "SA",  flag: "🇦🇺" },
  { first: "Shane",     last: "Walker",     loc: "NSW", flag: "🇦🇺" },
  // ── Female ──
  { first: "Sienna",    last: "Evans",      loc: "VIC", flag: "🇦🇺" },
  { first: "Matilda",   last: "White",      loc: "NSW", flag: "🇦🇺" },
  { first: "Isla",      last: "Harris",     loc: "QLD", flag: "🇦🇺" },
  { first: "Imogen",    last: "Robinson",   loc: "VIC", flag: "🇦🇺" },
  { first: "Zoe",       last: "Thompson",   loc: "WA",  flag: "🇦🇺" },
  { first: "Freya",     last: "Campbell",   loc: "NSW", flag: "🇦🇺" },
  { first: "Ellie",     last: "Roberts",    loc: "QLD", flag: "🇦🇺" },
  { first: "Phoebe",    last: "Mitchell",   loc: "VIC", flag: "🇦🇺" },
  { first: "Chloe",     last: "Turner",     loc: "SA",  flag: "🇦🇺" },
  { first: "Ruby",      last: "Stewart",    loc: "NSW", flag: "🇦🇺" },
  { first: "Grace",     last: "Cooper",     loc: "VIC", flag: "🇦🇺" },
  { first: "Sophie",    last: "Lee",        loc: "NSW", flag: "🇦🇺" },
  { first: "Amelia",    last: "Hall",       loc: "QLD", flag: "🇦🇺" },
  { first: "Lily",      last: "Phillips",   loc: "VIC", flag: "🇦🇺" },
  { first: "Tara",      last: "Moore",      loc: "ACT", flag: "🇦🇺" },
  { first: "Bridget",   last: "Scott",      loc: "TAS", flag: "🇦🇺" },
  { first: "Jade",      last: "Young",      loc: "NT",  flag: "🇦🇺" },
];

const DE_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "Hans",      last: "Müller",     loc: "BY",  flag: "🇩🇪" },
  { first: "Stefan",    last: "Schmidt",    loc: "NW",  flag: "🇩🇪" },
  { first: "Klaus",     last: "Schneider",  loc: "BW",  flag: "🇩🇪" },
  { first: "Thomas",    last: "Fischer",    loc: "NI",  flag: "🇩🇪" },
  { first: "Michael",   last: "Weber",      loc: "HE",  flag: "🇩🇪" },
  { first: "Andreas",   last: "Meyer",      loc: "BE",  flag: "🇩🇪" },
  { first: "Christian", last: "Wagner",     loc: "BW",  flag: "🇩🇪" },
  { first: "Markus",    last: "Becker",     loc: "BY",  flag: "🇩🇪" },
  { first: "Tobias",    last: "Hoffmann",   loc: "NW",  flag: "🇩🇪" },
  { first: "Felix",     last: "Schäfer",    loc: "HH",  flag: "🇩🇪" },
  { first: "Lukas",     last: "Koch",       loc: "BE",  flag: "🇩🇪" },
  { first: "Julian",    last: "Bauer",      loc: "SH",  flag: "🇩🇪" },
  { first: "Florian",   last: "Richter",    loc: "BY",  flag: "🇩🇪" },
  { first: "Jan",       last: "Klein",      loc: "SN",  flag: "🇩🇪" },
  { first: "Niklas",    last: "Wolf",       loc: "NW",  flag: "🇩🇪" },
  // ── Female ──
  { first: "Heike",     last: "Braun",      loc: "NI",  flag: "🇩🇪" },
  { first: "Sabine",    last: "Lange",      loc: "BW",  flag: "🇩🇪" },
  { first: "Monika",    last: "Zimmermann", loc: "BY",  flag: "🇩🇪" },
  { first: "Petra",     last: "Krause",     loc: "BE",  flag: "🇩🇪" },
  { first: "Ute",       last: "Krüger",     loc: "NW",  flag: "🇩🇪" },
  { first: "Karin",     last: "Hartmann",   loc: "HE",  flag: "🇩🇪" },
  { first: "Claudia",   last: "Schulz",     loc: "BW",  flag: "🇩🇪" },
  { first: "Birgit",    last: "Lehmann",    loc: "BY",  flag: "🇩🇪" },
  { first: "Stefanie",  last: "Neumann",    loc: "HH",  flag: "🇩🇪" },
  { first: "Melanie",   last: "Schwarz",    loc: "SN",  flag: "🇩🇪" },
  { first: "Laura",     last: "Günther",    loc: "NW",  flag: "🇩🇪" },
  { first: "Hannah",    last: "Huber",      loc: "BY",  flag: "🇩🇪" },
  { first: "Lisa",      last: "Schumacher", loc: "NI",  flag: "🇩🇪" },
  { first: "Anna",      last: "Brandt",     loc: "BE",  flag: "🇩🇪" },
  { first: "Julia",     last: "Maier",      loc: "BW",  flag: "🇩🇪" },
];

// ─── Combined weighted pool ───────────────────────────────────────────────────
// US: ~45%, CA: ~20%, AU: ~20%, DE: ~15%
const ALL_RECIPIENTS: Recipient[] = [
  ...US_RECIPIENTS, ...US_RECIPIENTS, ...US_RECIPIENTS, // ×3 weight
  ...CA_RECIPIENTS, ...CA_RECIPIENTS,                   // ×2 weight
  ...AU_RECIPIENTS, ...AU_RECIPIENTS,                   // ×2 weight
  ...DE_RECIPIENTS,                                     // ×1 weight
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
  const { first, last, loc, flag } = pick(ALL_RECIPIENTS);
  const name = `${first} ${last}`;
  return `🎉 Congratulations ${name} (${loc}) ${flag} — approved for a $${amount.toLocaleString("en-US")} ${cat.label} grant.   🌱 Your seed can be next.`;
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

        let headOffset = 0;
        for (let i = 0; i < head.current; i++) {
          const s = spanRefs.current[i];
          if (s) headOffset += s.offsetWidth + GAP;
        }

        let totalWidth = 0;
        for (let i = 0; i < SLOT_COUNT; i++) {
          const s = spanRefs.current[i];
          if (s) totalWidth += s.offsetWidth + GAP;
        }

        let translate = headOffset + pos.current;
        if (totalWidth > 0) translate = ((translate % totalWidth) + totalWidth) % totalWidth;

        track.style.transform = `translateX(-${translate}px)`;
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

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
                key={i}
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
