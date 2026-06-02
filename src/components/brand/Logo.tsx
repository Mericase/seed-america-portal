import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-forest shadow-elegant ring-2 ring-gold/40">
        <Sprout className="h-5 w-5 text-gold" strokeWidth={2.4} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.05rem] font-semibold tracking-tight ${isLight ? "text-white" : "text-primary"}`}>
          Seedin <span className="text-gold">America</span>
        </span>
        <span className={`text-[10px] uppercase tracking-[0.18em] ${isLight ? "text-white/70" : "text-muted-foreground"}`}>
          Plant · Grow · Prosper
        </span>
      </span>
    </Link>
  );
}
