import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

// ─── Name pools ──────────────────────────────────────────────────────────────

// Each entry: [firstName, lastName, locationCode]
// Location codes: US state abbrevs | Canadian province abbrevs | AU state abbrevs | DE state abbrevs
type Recipient = { first: string; last: string; loc: string };

const US_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "James",       last: "Smith",      loc: "TX" },
  { first: "Michael",     last: "Johnson",    loc: "FL" },
  { first: "Robert",      last: "Williams",   loc: "CA" },
  { first: "David",       last: "Brown",      loc: "NY" },
  { first: "William",     last: "Jones",      loc: "GA" },
  { first: "Richard",     last: "Davis",      loc: "OH" },
  { first: "Joseph",      last: "Miller",     loc: "PA" },
  { first: "Thomas",      last: "Wilson",     loc: "IL" },
  { first: "Christopher", last: "Moore",      loc: "AZ" },
  { first: "Daniel",      last: "Taylor",     loc: "NC" },
  { first: "Matthew",     last: "Anderson",   loc: "TN" },
  { first: "Anthony",     last: "Thomas",     loc: "MI" },
  { first: "Mark",        last: "Jackson",    loc: "MO" },
  { first: "Steven",      last: "Harris",     loc: "VA" },
  { first: "Brandon",     last: "Martin",     loc: "WA" },
  { first: "Tyler",       last: "Garcia",     loc: "NJ" },
  { first: "Justin",      last: "Martinez",   loc: "MN" },
  { first: "Kevin",       last: "Robinson",   loc: "CO" },
  { first: "Brian",       last: "Clark",      loc: "OR" },
  { first: "Eric",        last: "Rodriguez",  loc: "NV" },
  { first: "Ryan",        last: "Lewis",      loc: "IN" },
  { first: "Nathan",      last: "Lee",        loc: "WI" },
  { first: "Jacob",       last: "Walker",     loc: "AL" },
  { first: "Logan",       last: "Hall",       loc: "SC" },
  { first: "Ethan",       last: "Allen",      loc: "KY" },
  { first: "Elijah",      last: "Young",      loc: "OK" },
  { first: "Marcus",      last: "King",       loc: "LA" },
  { first: "Malik",       last: "Wright",     loc: "MD" },
  { first: "Jamal",       last: "Scott",      loc: "UT" },
  { first: "DeShawn",     last: "Green",      loc: "AR" },
  { first: "Carlos",      last: "Torres",     loc: "TX" },
  { first: "Luis",        last: "Flores",     loc: "CA" },
  { first: "Miguel",      last: "Rivera",     loc: "NM" },
  { first: "Juan",        last: "Perez",      loc: "AZ" },
  { first: "Andres",      last: "Ramirez",    loc: "FL" },
  { first: "Diego",       last: "Gutierrez",  loc: "TX" },
  // ── Female ──
  { first: "Mary",        last: "Campbell",   loc: "NC" },
  { first: "Patricia",    last: "Mitchell",   loc: "GA" },
  { first: "Jennifer",    last: "Carter",     loc: "OH" },
  { first: "Linda",       last: "Roberts",    loc: "PA" },
  { first: "Elizabeth",   last: "Turner",     loc: "IL" },
  { first: "Barbara",     last: "Phillips",   loc: "NY" },
  { first: "Susan",       last: "Evans",      loc: "VA" },
  { first: "Jessica",     last: "Edwards",    loc: "TN" },
  { first: "Sarah",       last: "Collins",    loc: "WA" },
  { first: "Karen",       last: "Stewart",    loc: "MI" },
  { first: "Ashley",      last: "Morris",     loc: "AZ" },
  { first: "Amanda",      last: "Murphy",     loc: "CO" },
  { first: "Melissa",     last: "Rogers",     loc: "MN" },
  { first: "Angela",      last: "Cook",       loc: "WI" },
  { first: "Nicole",      last: "Morgan",     loc: "OR" },
  { first: "Emma",        last: "Bailey",     loc: "FL" },
  { first: "Olivia",      last: "Bell",       loc: "CA" },
  { first: "Sophia",      last: "Gomez",      loc: "TX" },
  { first: "Keisha",      last: "Howard",     loc: "GA" },
  { first: "Tamika",      last: "Ward",       loc: "SC" },
  { first: "Jasmine",     last: "Cox",        loc: "NY" },
  { first: "Vanessa",     last: "Diaz",       loc: "NJ" },
  { first: "Rosa",        last: "Reyes",      loc: "CA" },
  { first: "Elena",       last: "Cruz",       loc: "TX" },
  { first: "Gabriela",    last: "Morales",    loc: "AZ" },
  { first: "Carmen",      last: "Ortiz",      loc: "FL" },
];

const CA_RECIPIENTS: Recipient[] = [
  // ── Anglophone ──
  { first: "Liam",      last: "MacDonald",  loc: "ON" },
  { first: "Noah",      last: "Murray",     loc: "BC" },
  { first: "Ethan",     last: "Campbell",   loc: "AB" },
  { first: "Owen",      last: "Stewart",    loc: "MB" },
  { first: "Aiden",     last: "MacLeod",    loc: "NS" },
  { first: "Connor",    last: "O'Brien",    loc: "SK" },
  { first: "Declan",    last: "Murphy",     loc: "NB" },
  { first: "Callum",    last: "Morrison",   loc: "ON" },
  { first: "Finn",      last: "Armstrong",  loc: "BC" },
  { first: "Hunter",    last: "Clarke",     loc: "AB" },
  { first: "Avery",     last: "Robertson",  loc: "ON" },
  { first: "Isla",      last: "Henderson",  loc: "BC" },
  { first: "Emma",      last: "Thomson",    loc: "AB" },
  { first: "Chloe",     last: "Mitchell",   loc: "ON" },
  { first: "Zoey",      last: "Hamilton",   loc: "MB" },
  { first: "Abigail",   last: "Young",      loc: "NS" },
  { first: "Hannah",    last: "Scott",      loc: "SK" },
  { first: "Natalie",   last: "Graham",     loc: "BC" },
  // ── Francophone ──
  { first: "Jean",      last: "Tremblay",   loc: "QC" },
  { first: "Pierre",    last: "Gagnon",     loc: "QC" },
  { first: "François",  last: "Roy",        loc: "QC" },
  { first: "Marc",      last: "Côté",       loc: "QC" },
  { first: "Sébastien", last: "Bouchard",   loc: "QC" },
  { first: "Maxime",    last: "Fortin",     loc: "QC" },
  { first: "Alexandre", last: "Gauthier",   loc: "QC" },
  { first: "Chantal",   last: "Leblanc",    loc: "QC" },
  { first: "Sophie",    last: "Morin",      loc: "QC" },
  { first: "Nathalie",  last: "Lavoie",     loc: "QC" },
  { first: "Isabelle",  last: "Ouellet",    loc: "QC" },
  { first: "Mélanie",   last: "Pelletier",  loc: "QC" },
  { first: "Valérie",   last: "Bergeron",   loc: "QC" },
  // ── Mixed ──
  { first: "Dylan",     last: "Beaulieu",   loc: "ON" },
  { first: "Kayla",     last: "Fontaine",   loc: "MB" },
  { first: "Tyler",     last: "Vachon",     loc: "BC" },
  { first: "Amber",     last: "Leclerc",    loc: "AB" },
  { first: "Raj",       last: "Patel",      loc: "ON" },
  { first: "Priya",     last: "Singh",      loc: "BC" },
  { first: "Harpreet",  last: "Gill",       loc: "AB" },
  { first: "Amy",       last: "Chen",       loc: "ON" },
  { first: "Wei",       last: "Zhang",      loc: "BC" },
  { first: "Mei",       last: "Liu",        loc: "ON" },
];

const AU_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "Lachlan",   last: "Smith",      loc: "NSW" },
  { first: "Hamish",    last: "Jones",      loc: "VIC" },
  { first: "Angus",     last: "Williams",   loc: "QLD" },
  { first: "Fraser",    last: "Brown",      loc: "WA" },
  { first: "Callum",    last: "Taylor",     loc: "SA" },
  { first: "Flynn",     last: "Wilson",     loc: "NSW" },
  { first: "Brody",     last: "Johnson",    loc: "QLD" },
  { first: "Cooper",    last: "Anderson",   loc: "VIC" },
  { first: "Remy",      last: "Thomas",     loc: "NSW" },
  { first: "Blake",     last: "O'Brien",    loc: "QLD" },
  { first: "Declan",    last: "Murphy",     loc: "VIC" },
  { first: "Jake",      last: "Morrison",   loc: "WA" },
  { first: "Dylan",     last: "Martin",     loc: "NSW" },
  { first: "Brendan",   last: "Clarke",     loc: "SA" },
  { first: "Shane",     last: "Walker",     loc: "NSW" },
  // ── Female ──
  { first: "Sienna",    last: "Evans",      loc: "VIC" },
  { first: "Matilda",   last: "White",      loc: "NSW" },
  { first: "Isla",      last: "Harris",     loc: "QLD" },
  { first: "Imogen",    last: "Robinson",   loc: "VIC" },
  { first: "Zoe",       last: "Thompson",   loc: "WA" },
  { first: "Freya",     last: "Campbell",   loc: "NSW" },
  { first: "Ellie",     last: "Roberts",    loc: "QLD" },
  { first: "Phoebe",    last: "Mitchell",   loc: "VIC" },
  { first: "Chloe",     last: "Turner",     loc: "SA" },
  { first: "Ruby",      last: "Stewart",    loc: "NSW" },
  { first: "Grace",     last: "Cooper",     loc: "VIC" },
  { first: "Sophie",    last: "Lee",        loc: "NSW" },
  { first: "Amelia",    last: "Hall",       loc: "QLD" },
  { first: "Lily",      last: "Phillips",   loc: "VIC" },
  { first: "Tara",      last: "Moore",      loc: "ACT" },
  { first: "Bridget",   last: "Scott",      loc: "TAS" },
  { first: "Jade",      last: "Young",      loc: "NT" },
];

const DE_RECIPIENTS: Recipient[] = [
  // ── Male ──
  { first: "Hans",      last: "Müller",     loc: "BY" },
  { first: "Stefan",    last: "Schmidt",    loc: "NW" },
  { first: "Klaus",     last: "Schneider",  loc: "BW" },
  { first: "Thomas",    last: "Fischer",    loc: "NI" },
  { first: "Michael",   last: "Weber",      loc: "HE" },
  { first: "Andreas",   last: "Meyer",      loc: "BE" },
  { first: "Christian", last: "Wagner",     loc: "BW" },
  { first: "Markus",    last: "Becker",     loc: "BY" },
  { first: "Tobias",    last: "Hoffmann",   loc: "NW" },
  { first: "Felix",     last: "Schäfer",    loc: "HH" },
  { first: "Lukas",     last: "Koch",       loc: "BE" },
  { first: "Julian",    last: "Bauer",      loc: "SH" },
  { first: "Florian",   last: "Richter",    loc: "BY" },
  { first: "Jan",       last: "Klein",      loc: "SN" },
  { first: "Niklas",    last: "Wolf",       loc: "NW" },
  // ── Female ──
  { first: "Heike",     last: "Braun",      loc: "NI" },
  { first: "Sabine",    last: "Lange",      loc: "BW" },
  { first: "Monika",    last: "Zimmermann", loc: "BY" },
  { first: "Petra",     last: "Krause",     loc: "BE" },
  { first: "Ute",       last: "Krüger",     loc: "NW" },
  { first: "Karin",     last: "Hartmann",   loc: "HE" },
  { first: "Claudia",   last: "Schulz",     loc: "BW" },
  { first: "Birgit",    last: "Lehmann",    loc: "BY" },
  { first: "Stefanie",  last: "Neumann",    loc: "HH" },
  { first: "Melanie",   last: "Schwarz",    loc: "SN" },
  { first: "Laura",     last: "Günther",    loc: "NW" },
  { first: "Hannah",    last: "Huber",      loc: "BY" },
  { first: "Lisa",      last: "Schumacher", loc: "NI" },
  { first: "Anna",      last: "Brandt",     loc: "BE" },
  { first: "Julia",     last: "Maier",      loc: "BW" },
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
  const { first, last, loc } = pick(ALL_RECIPIENTS);
  const name = `${first} ${last}`;
  return `🎉 Congratulations ${name} (${loc}) — approved for a $${amount.toLocaleString("en-US")} ${cat.label} grant.   🌱 Your seed can be next.`;
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
