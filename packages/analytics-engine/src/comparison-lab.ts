import jStat from "jstat";
import { correlationCoefficient } from "./derived";

/** Field semantics for intelligent pairing (Comparison Lab). */
export type ComparisonDataType = "numeric" | "categorical" | "binary" | "ratio";

export type ComparisonEntity =
  | "preconception"
  | "pregnancy"
  | "postnatal"
  | "infant"
  | "outcome";

export type ComparisonLevel = "individual" | "aggregated";

export type ComparisonMetricDef = {
  id: string;
  label: string;
  /** Short label for dense UI */
  shortLabel: string;
  dataType: ComparisonDataType;
  entity: ComparisonEntity;
  level: ComparisonLevel;
  /** When true, values are 0/1 style counts — can pair as binary or numeric */
  isBinaryCount?: boolean;
  /** When set, this metric drives time-series line mode (x = period bucket) */
  isTimeIndex?: boolean;
};

/** Which chart the UI should prefer after a successful run */
export type ComparisonChartKind =
  | "scatter_regression"
  | "line_trend"
  | "bar_groups"
  | "boxplot_style_bars"
  | "bubble_3d"
  | "contingency_heatmap"
  | "distribution_bars";

export type CompareResult = {
  ok: boolean;
  /** Shown when ok is false (tooltip) */
  reason?: string;
};

const ENTITY_LINK: Record<ComparisonEntity, ComparisonEntity[]> = {
  preconception: ["preconception", "pregnancy", "outcome"],
  pregnancy: ["preconception", "pregnancy", "outcome", "postnatal", "infant"],
  postnatal: ["pregnancy", "outcome", "postnatal", "infant"],
  infant: ["pregnancy", "outcome", "postnatal", "infant"],
  outcome: ["preconception", "pregnancy", "outcome", "postnatal", "infant"],
};

function entityLinked(a: ComparisonEntity, b: ComparisonEntity): boolean {
  return ENTITY_LINK[a]?.includes(b) ?? false;
}

function isNumericLike(t: ComparisonDataType): boolean {
  return t === "numeric" || t === "ratio" || t === "binary";
}

/** Exported for UI: whether a metric can participate in numeric scatter / bubble axes */
export function isMetricNumericLike(m: ComparisonMetricDef): boolean {
  return isNumericLike(m.dataType);
}

/** Rules: valid comparisons only; entity linkage; level match; type pairing. */
export function canCompareMetrics(ma: ComparisonMetricDef, mb: ComparisonMetricDef): CompareResult {
  if (ma.level !== mb.level) {
    return { ok: false, reason: "Not compatible: Aggregation mismatch (individual vs aggregated)." };
  }
  if (!entityLinked(ma.entity, mb.entity)) {
    return {
      ok: false,
      reason: `Not compatible: Different entity without linkage (${humanEntity(ma.entity)} vs ${humanEntity(mb.entity)}).`,
    };
  }

  const aNum = isNumericLike(ma.dataType);
  const bNum = isNumericLike(mb.dataType);

  if (aNum && bNum) return { ok: true };

  if (
    (ma.dataType === "categorical" && bNum) ||
    (mb.dataType === "categorical" && aNum)
  ) {
    return { ok: true };
  }

  if (ma.dataType === "categorical" && mb.dataType === "categorical") {
    return { ok: true };
  }

  return { ok: false, reason: "Not compatible: Pairing not supported for these data types." };
}

function humanEntity(e: ComparisonEntity): string {
  const m: Record<ComparisonEntity, string> = {
    preconception: "Preconception",
    pregnancy: "Pregnancy",
    postnatal: "Postnatal",
    infant: "Infant",
    outcome: "Outcome",
  };
  return m[e] ?? e;
}

/** Precompute N×N compatibility for catalog (ids order matches metrics array). */
export function buildCompatibilityMatrix(metrics: ComparisonMetricDef[]): Record<string, Record<string, CompareResult>> {
  const out: Record<string, Record<string, CompareResult>> = {};
  for (const a of metrics) {
    out[a.id] = {};
    for (const b of metrics) {
      out[a.id]![b.id] = a.id === b.id ? { ok: false, reason: "Select two different metrics." } : canCompareMetrics(a, b);
    }
  }
  return out;
}

/** After picking metric A, which B remain valid */
export function compatibleIdsForA(
  metrics: ComparisonMetricDef[],
  matrix: Record<string, Record<string, CompareResult>>,
  metricAId: string,
): Set<string> {
  const row = matrix[metricAId];
  if (!row) return new Set();
  const ok = new Set<string>();
  for (const m of metrics) {
    if (m.id === metricAId) continue;
    if (row[m.id]?.ok) ok.add(m.id);
  }
  return ok;
}

/** Optional third metric for bubble chart: must pair with A and B and be numeric-like. */
export function canTripleMetric(a: ComparisonMetricDef, b: ComparisonMetricDef, c: ComparisonMetricDef): CompareResult {
  const ab = canCompareMetrics(a, b);
  if (!ab.ok) return ab;
  const ac = canCompareMetrics(a, c);
  if (!ac.ok) return { ok: false, reason: `Metric C: ${ac.reason ?? "incompatible"}` };
  const bc = canCompareMetrics(b, c);
  if (!bc.ok) return { ok: false, reason: `Metric C: ${bc.reason ?? "incompatible"}` };
  if (!isNumericLike(a.dataType) || !isNumericLike(b.dataType) || !isNumericLike(c.dataType)) {
    return { ok: false, reason: "Not compatible: Three-variable view requires numeric (or ratio/binary) metrics." };
  }
  return { ok: true };
}

function isNumericType(t: ComparisonDataType): boolean {
  return t === "numeric" || t === "ratio" || t === "binary";
}

/** Auto chart selection from metric definitions (A primary, B secondary, C optional third numeric). */
export function selectChartKind(
  a: ComparisonMetricDef,
  b: ComparisonMetricDef,
  c?: ComparisonMetricDef | null,
): ComparisonChartKind {
  if (c && isNumericType(a.dataType) && isNumericType(b.dataType) && isNumericType(c.dataType)) {
    return "bubble_3d";
  }
  if (a.isTimeIndex && isNumericType(b.dataType)) return "line_trend";
  if (b.isTimeIndex && isNumericType(a.dataType)) return "line_trend";

  const aNum = isNumericType(a.dataType);
  const bNum = isNumericType(b.dataType);
  if (aNum && bNum) return "scatter_regression";

  if (
    (a.dataType === "categorical" && bNum) ||
    (b.dataType === "categorical" && aNum)
  ) {
    return "bar_groups";
  }

  if (a.dataType === "categorical" && b.dataType === "categorical") {
    return "contingency_heatmap";
  }

  return "scatter_regression";
}

/** --- Statistics --- */

export type ScatterPoint = { assessmentId: string; x: number; y: number };

/** OLS y ~ x for scatter / Comparison Lab */
export function leastSquaresRegression(points: ScatterPoint[]): { slope: number; intercept: number; r2: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    sxx += dx * dx;
    sxy += dx * (p.y - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const r = correlationCoefficient(xs, ys);
  const r2 = r == null ? 0 : r * r;
  return { slope, intercept, r2 };
}

/** Fisher z + normal approx two-tailed p-value for Pearson r */
export function pearsonSignificance(r: number | null, n: number): { pValue: number | null; zScore: number | null } {
  if (r == null || n < 4) return { pValue: null, zScore: null };
  const clamped = Math.max(-0.999, Math.min(0.999, r));
  const z = Math.sqrt(Math.max(0, n - 3)) * Math.atanh(clamped);
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { pValue: Math.min(1, Math.max(0, p)), zScore: z };
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
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
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

export type GroupStat = { key: string; n: number; mean: number; std: number };

/** Numeric by categorical group — bar / ANOVA-style */
export function groupNumericByCategory(
  rows: Array<{ category: string; value: number }>,
  maxCategories = 24,
): GroupStat[] {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.category || "—";
    const arr = map.get(k) ?? [];
    arr.push(r.value);
    map.set(k, arr);
  }
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b)).slice(0, maxCategories);
  const out: GroupStat[] = [];
  for (const key of keys) {
    const vals = map.get(key) ?? [];
    if (vals.length === 0) continue;
    const n = vals.length;
    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const varSum = vals.reduce((s, v) => s + (v - mean) ** 2, 0);
    const std = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;
    out.push({ key, n, mean, std });
  }
  return out;
}

/** One-way ANOVA p-value (simplified, equal-weight groups) */
export function anovaPValue(groups: GroupStat[]): number | null {
  const filtered = groups.filter((g) => g.n > 0);
  if (filtered.length < 2) return null;
  const N = filtered.reduce((s, g) => s + g.n, 0);
  if (N < filtered.length + 1) return null;
  const grand =
    filtered.reduce((s, g) => s + g.mean * g.n, 0) / N;

  let ssb = 0;
  for (const g of filtered) {
    ssb += g.n * (g.mean - grand) ** 2;
  }
  let ssw = 0;
  for (const g of filtered) {
    ssw += (g.n - 1) * (g.std * g.std);
  }
  const dfBetween = filtered.length - 1;
  const dfWithin = N - filtered.length;
  if (dfWithin <= 0 || dfBetween <= 0) return null;
  const msb = ssb / dfBetween;
  const msw = ssw / dfWithin;
  if (msw === 0) return null;
  const F = msb / msw;
  const cdf = jStat.centralF.cdf(F, dfBetween, dfWithin);
  return Math.max(0, Math.min(1, 1 - cdf));
}

/** Chi-square test for two categorical columns (contingency), max r×c */
export function chiSquareContingency(
  rows: Array<{ a: string; b: string }>,
  maxA = 12,
  maxB = 12,
): {
  chi2: number;
  pValue: number | null;
  df: number;
  aKeys: string[];
  bKeys: string[];
  counts: number[][];
} | null {
  const aKeys = [...new Set(rows.map((r) => r.a))].sort().slice(0, maxA);
  const bKeys = [...new Set(rows.map((r) => r.b))].sort().slice(0, maxB);
  if (aKeys.length < 2 || bKeys.length < 2) return null;
  const counts: number[][] = aKeys.map(() => bKeys.map(() => 0));
  let n = 0;
  for (const r of rows) {
    const ia = aKeys.indexOf(r.a);
    const ib = bKeys.indexOf(r.b);
    if (ia < 0 || ib < 0) continue;
    counts[ia]![ib]! += 1;
    n += 1;
  }
  if (n < 4) return null;
  const rowSum = counts.map((row) => row.reduce((s, v) => s + v, 0));
  const colSum = bKeys.map((_, j) => counts.reduce((s, row) => s + row[j]!, 0));
  let chi2 = 0;
  for (let i = 0; i < aKeys.length; i++) {
    for (let j = 0; j < bKeys.length; j++) {
      const e = (rowSum[i]! * colSum[j]!) / n;
      if (e > 0) {
        const o = counts[i]![j]!;
        chi2 += ((o - e) ** 2) / e;
      }
    }
  }
  const df = (aKeys.length - 1) * (bKeys.length - 1);
  if (df <= 0) return null;
  const cdf = jStat.chisquare.cdf(chi2, df);
  const pValue = Math.max(0, Math.min(1, 1 - cdf));
  return {
    chi2,
    pValue,
    df,
    aKeys,
    bKeys,
    counts: counts.map((row) => [...row]),
  };
}

/** Narrative summary for UI */
export function buildInsightSummary(params: {
  chartKind: ComparisonChartKind;
  n: number;
  pearsonR?: number | null;
  pValue?: number | null;
  anovaP?: number | null;
  chi2P?: number | null;
  labelA: string;
  labelB: string;
}): string {
  const { chartKind, n, pearsonR, pValue, anovaP, chi2P, labelA, labelB } = params;
  const pStr = (p: number | null | undefined) =>
    p == null ? "n/a" : p < 0.001 ? "<0.001" : p.toFixed(3);
  if (chartKind === "scatter_regression" || chartKind === "line_trend") {
    const rStr = pearsonR == null ? "n/a" : pearsonR.toFixed(3);
    return `Across ${n} assessment rows, ${labelA} vs ${labelB} shows Pearson r=${rStr} (two-tailed p=${pStr(pValue)}). Interpret in context of facility-period reporting, not individual patients.`;
  }
  if (chartKind === "bar_groups") {
    return `Group comparison over ${n} rows: distribution of ${labelB} across categories of ${labelA} (one-way ANOVA p=${pStr(anovaP)}).`;
  }
  if (chartKind === "contingency_heatmap") {
    return `Contingency over ${n} rows: association between ${labelA} and ${labelB} (χ² p=${pStr(chi2P)}).`;
  }
  if (chartKind === "bubble_3d") {
    const rStr = pearsonR == null ? "n/a" : pearsonR.toFixed(3);
    return `Three-metric view over ${n} rows; A–B marginal Pearson r=${rStr} (p=${pStr(pValue)}).`;
  }
  return `Analysis over ${n} rows for ${labelA} and ${labelB}.`;
}

/** Registry — all metrics are per facility assessment row (individual level). */
export const COMPARISON_METRICS: ComparisonMetricDef[] = [
  {
    id: "meta.period_month",
    label: "Reporting month (period start)",
    shortLabel: "Month",
    dataType: "categorical",
    entity: "outcome",
    level: "individual",
    isTimeIndex: true,
  },
  {
    id: "facility.district",
    label: "District (facility)",
    shortLabel: "District",
    dataType: "categorical",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "pwrs.total_anc_registered",
    label: "ANC registered (total)",
    shortLabel: "Σ ANC",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwrs.hiv_tested",
    label: "HIV tested (ANC)",
    shortLabel: "HIV tests",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwrs.hemoglobin_tested_4_times",
    label: "Hemoglobin ×4 (ANC)",
    shortLabel: "Hb×4",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwrs.blood_pressure_checked",
    label: "Blood pressure checked",
    shortLabel: "BP checks",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwrs.gdm_ogtt_tested",
    label: "OGTT (GDM)",
    shortLabel: "OGTT",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwid.diabetes_mellitus",
    label: "Diabetes (identified, pregnancy)",
    shortLabel: "DM (ID)",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwid.severe_anemia_preg",
    label: "Severe anemia (pregnancy identified)",
    shortLabel: "Sev anemia",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "pwid.moderate_anemia_preg",
    label: "Moderate anemia (pregnancy identified)",
    shortLabel: "Mod anemia",
    dataType: "numeric",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "delivery.live_births",
    label: "Live births",
    shortLabel: "Live births",
    dataType: "numeric",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "delivery.maternal_deaths",
    label: "Maternal deaths",
    shortLabel: "Mat. deaths",
    dataType: "numeric",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "delivery.lbw_lt_2500g",
    label: "LBW (<2500g)",
    shortLabel: "LBW",
    dataType: "numeric",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "delivery.preterm_births_lt_37_weeks",
    label: "Preterm births (<37w)",
    shortLabel: "Preterm",
    dataType: "numeric",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "delivery.early_neonatal_deaths_lt_24hrs",
    label: "Early neonatal deaths (<24h)",
    shortLabel: "END24h",
    dataType: "numeric",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "ratio.hiv_per_anc",
    label: "HIV tests ÷ ANC (rate)",
    shortLabel: "HIV/ANC",
    dataType: "ratio",
    entity: "pregnancy",
    level: "individual",
  },
  {
    id: "ratio.lbw_per_live_birth",
    label: "LBW ÷ live births",
    shortLabel: "LBW/LB",
    dataType: "ratio",
    entity: "outcome",
    level: "individual",
  },
  {
    id: "pci.anemia_identified_sum",
    label: "Preconception anemia (severe+moderate, identified)",
    shortLabel: "PCI anemia",
    dataType: "numeric",
    entity: "preconception",
    level: "individual",
  },
  {
    id: "pcm.anemia_managed_sum",
    label: "Preconception anemia (severe+moderate, managed)",
    shortLabel: "PCM anemia",
    dataType: "numeric",
    entity: "preconception",
    level: "individual",
  },
  {
    id: "infant.fully_immunized_12_23_months",
    label: "Fully immunized (12–23m)",
    shortLabel: "FIM",
    dataType: "numeric",
    entity: "infant",
    level: "individual",
  },
  {
    id: "infant.ebf_0_6_months",
    label: "EBF 0–6 months",
    shortLabel: "EBF",
    dataType: "numeric",
    entity: "infant",
    level: "individual",
  },
  {
    id: "postnatal.postpartum_checkup_48h_to_14d",
    label: "Postpartum checkup (48h–14d)",
    shortLabel: "PP visit",
    dataType: "numeric",
    entity: "postnatal",
    level: "individual",
  },
  {
    id: "postnatal.hbnc_visits",
    label: "HBNC visits",
    shortLabel: "HBNC",
    dataType: "numeric",
    entity: "postnatal",
    level: "individual",
  },
];

export function getMetricDef(id: string): ComparisonMetricDef | undefined {
  return COMPARISON_METRICS.find((m) => m.id === id);
}
