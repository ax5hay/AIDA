/**
 * Single definition for matrix cell heat styling (Pearson r in [-1, 1]).
 * Thresholds are documented policy — adjust here to keep Correlations + Analytics consistent.
 */
const STRONG = 0.5;
const WEAK = 0.2;

export function correlationMatrixCellHeatClass(r: number | null | undefined, opts?: { variant?: "default" | "dense" }): string {
  if (r === null || r === undefined || Number.isNaN(r)) return "bg-transparent";
  const dense = opts?.variant === "dense";
  const posStrong = dense ? "bg-emerald-500/35" : "bg-emerald-500/30";
  const posWeak = dense ? "bg-emerald-500/18" : "bg-emerald-500/15";
  const negStrong = dense ? "bg-rose-500/35" : "bg-rose-500/30";
  const negWeak = dense ? "bg-rose-500/18" : "bg-rose-500/15";
  const neutral = dense ? "bg-white/5" : "bg-white/5";
  if (r > STRONG) return posStrong;
  if (r > WEAK) return posWeak;
  if (r < -STRONG) return negStrong;
  if (r < -WEAK) return negWeak;
  return neutral;
}
