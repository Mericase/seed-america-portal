import { Link } from "@tanstack/react-router";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-gold shadow-gold">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="currentColor" aria-hidden>
          <path d="M12 2c-2 4-4 6-4 9a4 4 0 0 0 8 0c0-3-2-5-4-9z" />
          <path d="M5 14c2 1 4 4 7 8 3-4 5-7 7-8-2-1-5 0-7 3-2-3-5-4-7-3z" opacity=".6" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.05rem] font-semibold tracking-tight ${isLight ? "text-white" : "text-primary"}`}>
          Seedin <span className="text-gold">America</span>
        </span>
        <span className={`text-[10px] uppercase tracking-[0.18em] ${isLight ? "text-white/70" : "text-muted-foreground"}`}>
          Federal Grant Initiative
        </span>
      </span>
    </Link>
  );
}
