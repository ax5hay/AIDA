/**
 * Splits assessment rows into "before" and "after" windows for exploratory programme timing.
 * Prefers a **median reporting timestamp** so both halves align with calendar time; falls back to
 * index bisection when all periodStart values are identical (degenerate timeline).
 */

export type InterventionComparisonMethod = "median_timestamp" | "index_bisection";

export type TemporalSplitResult<T> = {
  before: T[];
  after: T[];
  /** Last day of the "before" window (inclusive) when using index bisection; median date for timestamp split */
  cutoffPeriodStart: string | null;
  method: InterventionComparisonMethod;
  note: string;
};

function medianTimestampSorted(sortedMs: number[]): number {
  if (sortedMs.length === 0) return 0;
  const mid = Math.floor(sortedMs.length / 2);
  if (sortedMs.length % 2 === 1) return sortedMs[mid]!;
  return (sortedMs[mid - 1]! + sortedMs[mid]!) / 2;
}

/**
 * @param rows - assessments with periodStart; not mutated
 */
export function splitRowsForInterventionComparison<T extends { periodStart: Date }>(rows: T[]): TemporalSplitResult<T> {
  const baseNote =
    "Exploratory before/after view for programme timing — not a randomized trial. Pair with district rollups and coverage metrics.";

  if (rows.length === 0) {
    return {
      before: [],
      after: [],
      cutoffPeriodStart: null,
      method: "index_bisection",
      note: baseNote,
    };
  }

  const sorted = [...rows].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  const ts = sorted.map((r) => r.periodStart.getTime());
  const uniqueTs = new Set(ts);
  const medTs = medianTimestampSorted([...ts].sort((a, b) => a - b));

  let before = sorted.filter((r) => r.periodStart.getTime() < medTs);
  let after = sorted.filter((r) => r.periodStart.getTime() >= medTs);
  let method: InterventionComparisonMethod = "median_timestamp";
  let cutoff = new Date(medTs).toISOString().slice(0, 10);

  /** Degenerate: single reporting month or identical timestamps — use index bisection so both halves are non-empty when n≥2 */
  if ((before.length === 0 || after.length === 0) && sorted.length >= 2) {
    const mid = Math.max(1, Math.floor(sorted.length / 2));
    before = sorted.slice(0, mid);
    after = sorted.slice(mid);
    method = "index_bisection";
    const lastBefore = before[before.length - 1]!.periodStart;
    cutoff = lastBefore.toISOString().slice(0, 10);
  }

  const methodNote =
    method === "median_timestamp"
      ? `Split at median reporting time (${uniqueTs.size} distinct timestamps).`
      : "Index bisection (half of rows by sort order) — used when median time split would empty a side.";

  return {
    before,
    after,
    cutoffPeriodStart: cutoff,
    method,
    note: `${baseNote} ${methodNote}`,
  };
}
