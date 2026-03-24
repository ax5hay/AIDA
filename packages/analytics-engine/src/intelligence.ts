/**
 * Multi-dimensional public health analytics — pure functions over aggregated or per-row series.
 */

export type FunnelStageInput = { id: string; label: string; count: number };

export type FunnelStageMetric = FunnelStageInput & {
  /** Share of first stage (0–1); null if first is zero */
  conversionFromFirst: number | null;
  /** 1 - (count / prior); null if prior is zero or non-comparable */
  dropOffFromPrior: number | null;
  /** count / prior; null if prior is zero */
  retainedFromPrior: number | null;
  /** True when count exceeds prior (different denominators / reporting artifacts) */
  nonMonotonic: boolean;
};

/** Sequential funnel metrics; stages should be ordered from broad to narrow when possible */
export function funnelMetrics(stages: FunnelStageInput[]): FunnelStageMetric[] {
  return stages.map((s, i) => {
    const first = stages[0]?.count ?? 0;
    const prior = i > 0 ? stages[i - 1]!.count : null;
    const conversionFromFirst = first > 0 ? s.count / first : null;
    let retainedFromPrior: number | null = null;
    let dropOffFromPrior: number | null = null;
    let nonMonotonic = false;
    if (prior !== null && prior > 0) {
      retainedFromPrior = s.count / prior;
      dropOffFromPrior = 1 - retainedFromPrior;
      if (s.count > prior) nonMonotonic = true;
    }
    return {
      ...s,
      conversionFromFirst,
      dropOffFromPrior,
      retainedFromPrior,
      nonMonotonic,
    };
  });
}

/** Index of the stage with largest relative drop from prior (bottleneck) */
export function bottleneckStageIndex(metrics: FunnelStageMetric[]): number | null {
  let best = -1;
  let bestDrop = -1;
  for (let i = 1; i < metrics.length; i++) {
    const d = metrics[i]?.dropOffFromPrior;
    if (d === null || d === undefined || Number.isNaN(d)) continue;
    if (d > bestDrop) {
      bestDrop = d;
      best = i;
    }
  }
  return best >= 0 ? best : null;
}

export type GapTriple = {
  eligible: number;
  observed: number;
  gap: number;
  gapRate: number | null;
};

export function gapTriple(eligible: number, observed: number): GapTriple {
  const e = Math.max(0, eligible);
  const o = Math.max(0, observed);
  const gap = Math.max(0, e - o);
  return {
    eligible: e,
    observed: o,
    gap,
    gapRate: e > 0 ? gap / e : null,
  };
}

/** Spearman rank correlation (Pearson on ranks); ties averaged */
export function spearmanCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const ra = rank(a);
  const rb = rank(b);
  return pearsonFromRanks(ra, rb);
}

function rank(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((x, y) => x.v - y.v);
  const ranks = new Array<number>(values.length);
  let j = 0;
  while (j < indexed.length) {
    let k = j;
    while (k + 1 < indexed.length && indexed[k + 1]!.v === indexed[j]!.v) k++;
    const mid = (j + k + 1) / 2;
    for (let t = j; t <= k; t++) ranks[indexed[t]!.i] = mid;
    j = k + 1;
  }
  return ranks;
}

function pearsonFromRanks(a: number[], b: number[]): number | null {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const ca = a[i]! - ma;
    const cb = b[i]! - mb;
    num += ca * cb;
    da += ca * ca;
    db += cb * cb;
  }
  const den = Math.sqrt(da * db);
  if (den === 0) return null;
  return num / den;
}

export { correlationCoefficient as pearsonCorrelation } from "./derived";

/** 2×2 chi-square test of independence; returns χ², df=1, p-value (two-sided, using normal approx for large n) */
export function chiSquare2x2(table: {
  a: number;
  b: number;
  c: number;
  d: number;
}): { chi2: number; pApprox: number | null } {
  const { a, b, c, d } = table;
  const n = a + b + c + d;
  if (n <= 0) return { chi2: 0, pApprox: null };
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;
  const e11 = (row1 * col1) / n;
  const e12 = (row1 * col2) / n;
  const e21 = (row2 * col1) / n;
  const e22 = (row2 * col2) / n;
  if (e11 <= 0 || e12 <= 0 || e21 <= 0 || e22 <= 0) return { chi2: 0, pApprox: null };
  const chi2 =
    (a - e11) ** 2 / e11 + (b - e12) ** 2 / e12 + (c - e21) ** 2 / e21 + (d - e22) ** 2 / e22;
  const pApprox = chi2PValue(chi2, 1);
  return { chi2, pApprox };
}

/** Cumulative χ² survival Q(χ², k) via Wilson-Hilferty approx */
function chi2PValue(chi2: number, k: number): number | null {
  if (chi2 < 0 || k <= 0) return null;
  const x = Math.pow(chi2 / k, 1 / 3) - (1 - 2 / (9 * k));
  const s = Math.sqrt(2 / (9 * k));
  if (s === 0) return null;
  const z = x / s;
  return 2 * (1 - normalCdf(Math.abs(z)));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Risk ratio for exposed vs unexposed (2×2: [a b][c d]) */
export function riskRatio2x2(table: { a: number; b: number; c: number; d: number }): number | null {
  const { a, b, c, d } = table;
  const r1 = a / (a + b);
  const r0 = c / (c + d);
  if (!Number.isFinite(r1) || !Number.isFinite(r0) || r0 === 0) return null;
  return r1 / r0;
}

export type TrendDirection = "up" | "down" | "stable";

export function classifyTrend(
  values: number[],
  thresholdRel = 0.05,
): TrendDirection {
  if (values.length < 2) return "stable";
  const n = values.length;
  const mid = Math.floor(n / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const m1 = first.reduce((s, v) => s + v, 0) / first.length;
  const m2 = second.reduce((s, v) => s + v, 0) / second.length;
  const base = Math.max(1e-9, Math.abs(m1));
  const rel = (m2 - m1) / base;
  if (rel > thresholdRel) return "up";
  if (rel < -thresholdRel) return "down";
  return "stable";
}

export function movingAverage(values: number[], window: number): (number | null)[] {
  if (window < 1) return values.map((v) => v);
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < window) {
      out.push(null);
      continue;
    }
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j]!;
    out.push(s / window);
  }
  return out;
}

/** Simple seasonal index: value / mean for each month-of-year bucket (1-12) */
export function seasonalIndicesByMonth(
  points: Array<{ month: number; value: number }>,
): Record<number, number | null> {
  const sums = new Map<number, { s: number; n: number }>();
  for (const p of points) {
    const m = ((p.month - 1) % 12) + 1;
    const cur = sums.get(m) ?? { s: 0, n: 0 };
    cur.s += p.value;
    cur.n += 1;
    sums.set(m, cur);
  }
  const overall =
    points.reduce((s, p) => s + p.value, 0) / Math.max(1, points.length);
  const out: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m++) {
    const agg = sums.get(m);
    const mean = agg && agg.n > 0 ? agg.s / agg.n : null;
    out[m] = mean !== null && overall > 0 ? mean / overall : null;
  }
  return out;
}

export function zScoreSpikeIndices(values: number[], thresholdZ = 2): number[] {
  if (values.length < 3) return [];
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, values.length - 1),
  );
  if (sd === 0) return [];
  const out: number[] = [];
  values.forEach((v, i) => {
    const z = Math.abs((v - m) / sd);
    if (z > thresholdZ) out.push(i);
  });
  return out;
}

export type BoxPlotStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export function boxPlotStats(sortedValues: number[]): BoxPlotStats | null {
  if (sortedValues.length === 0) return null;
  const s = [...sortedValues].sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (s.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (s[base + 1] === undefined) return s[base]!;
    return s[base]! + rest * (s[base + 1]! - s[base]!);
  };
  return {
    min: s[0]!,
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
    max: s[s.length - 1]!,
  };
}

export function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; r2: number | null } | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? null : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}
