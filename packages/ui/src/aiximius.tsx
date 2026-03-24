import { cn } from "./cn";

/** Minimal company credit — intentionally low contrast. */
export function AiximiusMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] uppercase tracking-[0.28em] text-zinc-600/35",
        className,
      )}
      aria-hidden
    >
      Aiximius
    </span>
  );
}
