import { PARITY_INDICATORS, PARITY_INT_KEYS, PARITY_SECTION_LABEL } from "./indicators.js";

export type ParitySubmissionRow = {
  id: string;
  districtId: string;
  districtName: string;
  blockId: string;
  blockName: string;
  regionId: string;
  regionName: string;
  facilityId: string;
  facilityName: string;
  facilityTypeId: string;
  facilityTypeCode: string;
  periodYear: number;
  periodMonth: number;
  /** 0 = whole-month return; 1–31 = that calendar day. */
  periodDay: number;
  remarks: string | null;
  createdAt: string;
} & Partial<Record<(typeof PARITY_INT_KEYS)[number], number | null>>;

export type ParityQualityIssue = {
  submissionId: string;
  facilityLabel: string;
  period: string;
  code: string;
  message: string;
  severity: "error" | "warning";
};

function periodKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function dayPeriodKey(y: number, m: number, day: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Sortable key; `-00` day suffix = monthly row. */
export function parityRowSortKey(r: Pick<ParitySubmissionRow, "periodYear" | "periodMonth" | "periodDay">): string {
  const d = r.periodDay ?? 0;
  if (d <= 0) return `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}-00`;
  return dayPeriodKey(r.periodYear, r.periodMonth, d);
}

/**
 * Keys plotted as multi-line programme indicator time series (monthly + daily buckets).
 * Excludes tablet-scale fields (`isTabletField` / IFA strip totals) so lines stay comparable;
 * those values remain in observation detail, tables, and completeness — not here.
 */
const INDICATOR_TIME_SERIES_KEYS = [
  "totalWomenAttendedAnc",
  "noOfWomenObserved",
  "womenRegisteredIn1stTrimester",
  "mcpCardProvided",
  "broughtMcpCard",
  "hbByCbcFirstVisit",
  "hiv",
  "womenCalciumVitaminD",
] as const satisfies readonly (typeof PARITY_INT_KEYS)[number][];

function buildIndicatorMonthlySeries(
  rows: ParitySubmissionRow[],
  key: (typeof PARITY_INT_KEYS)[number],
): Array<{ period: string; sum: number; submissions: number }> {
  const m = new Map<string, { sum: number; submissions: number }>();
  for (const r of rows) {
    const pk = periodKey(r.periodYear, r.periodMonth);
    const cur = m.get(pk) ?? { sum: 0, submissions: 0 };
    cur.submissions += 1;
    const v = r[key];
    cur.sum += v == null ? 0 : v;
    m.set(pk, cur);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, x]) => ({ period, sum: x.sum, submissions: x.submissions }));
}

function buildIndicatorDailySeries(
  rows: ParitySubmissionRow[],
  key: (typeof PARITY_INT_KEYS)[number],
): Array<{ period: string; sum: number; submissions: number }> {
  const m = new Map<string, { sum: number; submissions: number }>();
  for (const r of rows) {
    const d = r.periodDay ?? 0;
    if (d <= 0) continue;
    const dk = dayPeriodKey(r.periodYear, r.periodMonth, d);
    const cur = m.get(dk) ?? { sum: 0, submissions: 0 };
    cur.submissions += 1;
    const v = r[key];
    cur.sum += v == null ? 0 : v;
    m.set(dk, cur);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, x]) => ({ period, sum: x.sum, submissions: x.submissions }));
}

function meanStd(values: number[]): { mean: number; std: number } | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  const std = Math.sqrt(v);
  if (std === 0) return null;
  return { mean, std };
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2;
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] == null) return sorted[base]!;
  return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
}

/** Median absolute deviation (scale factor 1.4826 ≈ σ for normal). */
function madScores(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  if (values.length < 3) return m;
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  if (med == null) return m;
  const devs = values.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  const mad = median(devs);
  if (mad == null || mad === 0) return m;
  const scale = 1.4826;
  for (let i = 0; i < values.length; i++) {
    m.set(i, (values[i]! - med) / (scale * mad));
  }
  return m;
}

export type ParityAnalyticsBundle = {
  generatedAt: string;
  summary: {
    submissionCount: number;
    distinctFacilities: number;
    distinctRegions: number;
    periodMin: string | null;
    periodMax: string | null;
    nullFieldRate: number;
    /** Blank indicator cells ÷ total indicator cells (all returns × all programme indicators). */
    nullIndicatorCells: number;
    filledIndicatorCells: number;
    totalIndicatorCells: number;
    /** Count of integer indicators on one monthly return (denominator per return for completeness). */
    indicatorsPerMonthlyReturn: number;
    /** Returns where “total women who attended ANC” is filled — denominator for ANC averages, median, percentiles, IQR/MAD. */
    returnsWithNonNullTotalAnc: number;
    /** Returns in selection with ANC total missing — excluded from ANC distribution stats. */
    returnsMissingTotalAnc: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
    medianTotalWomenAttendedAnc: number | null;
    p90TotalWomenAttendedAnc: number | null;
    /** True if any return in the slice uses daily granularity (periodDay ≥ 1). */
    hasDailyReturns: boolean;
  };
  byDistrict: Array<{
    districtId: string;
    name: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  byBlock: Array<{
    blockId: string;
    name: string;
    districtId: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  byRegion: Array<{
    regionId: string;
    name: string;
    blockId: string;
    blockName: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
    facilityCount: number;
  }>;
  byFacilityType: Array<{
    facilityTypeId: string;
    code: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  byFacility: Array<{
    facilityId: string;
    name: string;
    facilityTypeCode: string;
    regionName: string;
    blockName: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  /** Block × region rollup */
  byBlockRegion: Array<{
    blockId: string;
    blockName: string;
    regionId: string;
    regionName: string;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  /** Month × year time series (sorted) */
  timeSeries: Array<{
    period: string;
    periodYear: number;
    periodMonth: number;
    submissions: number;
    sumTotalWomenAttendedAnc: number;
    avgTotalWomenAttendedAnc: number | null;
  }>;
  /** Null rate by UI section */
  completenessBySection: Array<{
    section: string;
    label: string;
    nullRate: number;
    /** Indicators in this section on one return (multiplier for denominators). */
    fields: number;
    blankCells: number;
    totalCells: number;
    filledCells: number;
  }>;
  /** IQR outliers on totalWomenAttendedAnc (global) */
  outliersIqr: Array<{
    submissionId: string;
    facilityLabel: string;
    totalWomenAttendedAnc: number;
    fence: "low" | "high";
  }>;
  /** Modified z-score (MAD) on totalWomenAttendedAnc */
  anomaliesMad: Array<{
    submissionId: string;
    facilityLabel: string;
    totalWomenAttendedAnc: number;
    modifiedZ: number;
  }>;
  redundancies: Array<{
    facilityId: string;
    facilityName: string;
    periodYear: number;
    periodMonth: number;
    periodDay: number;
    submissionIds: string[];
  }>;
  /** Multi-indicator trends: all returns rolled up by calendar month (YYYY-MM). */
  indicatorTimeSeriesMonthly: Array<{
    key: string;
    label: string;
    points: Array<{ period: string; sum: number; submissions: number }>;
  }>;
  /** Same indicators, calendar day (YYYY-MM-DD) — only daily returns (periodDay ≥ 1). */
  indicatorTimeSeriesDaily: Array<{
    key: string;
    label: string;
    points: Array<{ period: string; sum: number; submissions: number }>;
  }>;
  /** z-score within block */
  anomaliesByBlock: Array<{
    submissionId: string;
    facilityLabel: string;
    blockId: string;
    blockName: string;
    totalWomenAttendedAnc: number;
    zScore: number;
    /** Returns in this block with ANC total filled — peer denominator for the z-score. */
    peerReturnsWithAncInBlock: number;
  }>;
  /** z-score within facility type */
  anomaliesByFacilityType: Array<{
    submissionId: string;
    facilityLabel: string;
    facilityTypeCode: string;
    totalWomenAttendedAnc: number;
    zScore: number;
    /** Returns of this facility type with ANC total filled — peer denominator. */
    peerReturnsWithAncInFacilityType: number;
  }>;
  qualityFlags: ParityQualityIssue[];
};

function facilityLabel(r: ParitySubmissionRow): string {
  return `${r.facilityName} (${r.facilityTypeCode})`;
}

export function buildParityAnalytics(rows: ParitySubmissionRow[]): ParityAnalyticsBundle {
  const now = new Date().toISOString();
  const n = rows.length;

  let nullCells = 0;
  let totalCells = 0;
  const sectionFieldCount = new Map<string, number>();
  const sectionNulls = new Map<string, number>();
  for (const ind of PARITY_INDICATORS) {
    sectionFieldCount.set(ind.section, (sectionFieldCount.get(ind.section) ?? 0) + 1);
  }

  for (const r of rows) {
    for (const ind of PARITY_INDICATORS) {
      const k = ind.key;
      totalCells += 1;
      if (r[k] == null) {
        nullCells += 1;
        sectionNulls.set(ind.section, (sectionNulls.get(ind.section) ?? 0) + 1);
      }
    }
  }

  const periodKeysSorted = [...new Set(rows.map(parityRowSortKey))].sort();
  const ancValues = rows.map((r) => r.totalWomenAttendedAnc).filter((v): v is number => v != null);
  const ancSorted = [...ancValues].sort((a, b) => a - b);

  const byDistrictMap = new Map<string, { name: string; submissions: number; sum: number }>();
  const byBlockMap = new Map<string, { name: string; districtId: string; submissions: number; sum: number }>();
  const byRegMap = new Map<
    string,
    { name: string; blockId: string; blockName: string; submissions: number; sum: number; facilities: Set<string> }
  >();
  const byFtMap = new Map<string, { code: string; submissions: number; sum: number }>();
  const byFacMap = new Map<string, { name: string; code: string; region: string; block: string; submissions: number; sum: number }>();
  const byBlockRegMap = new Map<
    string,
    { blockId: string; blockName: string; regionId: string; regionName: string; submissions: number; sum: number }
  >();
  const byPeriodMap = new Map<string, { y: number; m: number; submissions: number; sum: number }>();

  const dupMap = new Map<string, string[]>();
  const qualityFlags: ParityQualityIssue[] = [];

  for (const r of rows) {
    const tw = r.totalWomenAttendedAnc ?? 0;

    const d = byDistrictMap.get(r.districtId) ?? { name: r.districtName, submissions: 0, sum: 0 };
    d.submissions += 1;
    d.sum += tw;
    byDistrictMap.set(r.districtId, d);

    const b = byBlockMap.get(r.blockId) ?? { name: r.blockName, districtId: r.districtId, submissions: 0, sum: 0 };
    b.submissions += 1;
    b.sum += tw;
    byBlockMap.set(r.blockId, b);

    const reg =
      byRegMap.get(r.regionId) ??
      {
        name: r.regionName,
        blockId: r.blockId,
        blockName: r.blockName,
        submissions: 0,
        sum: 0,
        facilities: new Set<string>(),
      };
    reg.submissions += 1;
    reg.sum += tw;
    reg.facilities.add(r.facilityId);
    byRegMap.set(r.regionId, reg);

    const ft = byFtMap.get(r.facilityTypeId) ?? { code: r.facilityTypeCode, submissions: 0, sum: 0 };
    ft.submissions += 1;
    ft.sum += tw;
    byFtMap.set(r.facilityTypeId, ft);

    const fac =
      byFacMap.get(r.facilityId) ??
      { name: r.facilityName, code: r.facilityTypeCode, region: r.regionName, block: r.blockName, submissions: 0, sum: 0 };
    fac.submissions += 1;
    fac.sum += tw;
    byFacMap.set(r.facilityId, fac);

    const brKey = `${r.blockId}::${r.regionId}`;
    const br =
      byBlockRegMap.get(brKey) ??
      {
        blockId: r.blockId,
        blockName: r.blockName,
        regionId: r.regionId,
        regionName: r.regionName,
        submissions: 0,
        sum: 0,
      };
    br.submissions += 1;
    br.sum += tw;
    byBlockRegMap.set(brKey, br);

    const pk = periodKey(r.periodYear, r.periodMonth);
    const pm = byPeriodMap.get(pk) ?? { y: r.periodYear, m: r.periodMonth, submissions: 0, sum: 0 };
    pm.submissions += 1;
    pm.sum += tw;
    byPeriodMap.set(pk, pm);

    const dk = `${r.facilityId}|${r.periodYear}|${r.periodMonth}|${r.periodDay ?? 0}`;
    const list = dupMap.get(dk) ?? [];
    list.push(r.id);
    dupMap.set(dk, list);

    if (r.noOfWomenObserved != null && r.totalWomenAttendedAnc != null && r.noOfWomenObserved > r.totalWomenAttendedAnc) {
      qualityFlags.push({
        submissionId: r.id,
        facilityLabel: facilityLabel(r),
        period: parityRowSortKey(r),
        code: "OBSERVED_EXCEEDS_ATTENDED",
        message:
          "The “women observed” count is higher than “total women who attended ANC” on this return. Those two numbers should be consistent — please check the entry.",
        severity: "error",
      });
    }
  }

  const redundancies = [...dupMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, submissionIds]) => {
      const [facilityId, y, m, d] = key.split("|");
      const sample = rows.find((r) => r.id === submissionIds[0]);
      return {
        facilityId: facilityId!,
        facilityName: sample?.facilityName ?? facilityId!,
        periodYear: Number(y),
        periodMonth: Number(m),
        periodDay: Number(d),
        submissionIds,
      };
    });

  const anomaliesByBlock: ParityAnalyticsBundle["anomaliesByBlock"] = [];
  const byBlockVals = new Map<string, number[]>();
  for (const r of rows) {
    if (r.totalWomenAttendedAnc == null) continue;
    const list = byBlockVals.get(r.blockId) ?? [];
    list.push(r.totalWomenAttendedAnc);
    byBlockVals.set(r.blockId, list);
  }
  for (const r of rows) {
    if (r.totalWomenAttendedAnc == null) continue;
    const vals = byBlockVals.get(r.blockId) ?? [];
    const ms = meanStd(vals);
    if (!ms) continue;
    const z = (r.totalWomenAttendedAnc - ms.mean) / ms.std;
    if (Math.abs(z) >= 2.5) {
      anomaliesByBlock.push({
        submissionId: r.id,
        facilityLabel: facilityLabel(r),
        blockId: r.blockId,
        blockName: r.blockName,
        totalWomenAttendedAnc: r.totalWomenAttendedAnc,
        zScore: Math.round(z * 1000) / 1000,
        peerReturnsWithAncInBlock: vals.length,
      });
    }
  }

  const anomaliesByFacilityType: ParityAnalyticsBundle["anomaliesByFacilityType"] = [];
  const byFtVals = new Map<string, number[]>();
  for (const r of rows) {
    if (r.totalWomenAttendedAnc == null) continue;
    const list = byFtVals.get(r.facilityTypeId) ?? [];
    list.push(r.totalWomenAttendedAnc);
    byFtVals.set(r.facilityTypeId, list);
  }
  for (const r of rows) {
    if (r.totalWomenAttendedAnc == null) continue;
    const vals = byFtVals.get(r.facilityTypeId) ?? [];
    const ms = meanStd(vals);
    if (!ms) continue;
    const z = (r.totalWomenAttendedAnc - ms.mean) / ms.std;
    if (Math.abs(z) >= 2.5) {
      anomaliesByFacilityType.push({
        submissionId: r.id,
        facilityLabel: facilityLabel(r),
        facilityTypeCode: r.facilityTypeCode,
        totalWomenAttendedAnc: r.totalWomenAttendedAnc,
        zScore: Math.round(z * 1000) / 1000,
        peerReturnsWithAncInFacilityType: vals.length,
      });
    }
  }

  const outliersIqr: ParityAnalyticsBundle["outliersIqr"] = [];
  if (ancSorted.length >= 4) {
    const q1 = quantile(ancSorted, 0.25);
    const q3 = quantile(ancSorted, 0.75);
    if (q1 != null && q3 != null) {
      const iqr = q3 - q1;
      const low = q1 - 1.5 * iqr;
      const high = q3 + 1.5 * iqr;
      for (const r of rows) {
        if (r.totalWomenAttendedAnc == null) continue;
        if (r.totalWomenAttendedAnc < low) {
          outliersIqr.push({
            submissionId: r.id,
            facilityLabel: facilityLabel(r),
            totalWomenAttendedAnc: r.totalWomenAttendedAnc,
            fence: "low",
          });
        } else if (r.totalWomenAttendedAnc > high) {
          outliersIqr.push({
            submissionId: r.id,
            facilityLabel: facilityLabel(r),
            totalWomenAttendedAnc: r.totalWomenAttendedAnc,
            fence: "high",
          });
        }
      }
    }
  }

  const anomaliesMadFixed: ParityAnalyticsBundle["anomaliesMad"] = [];
  const twVals = rows.map((r) => r.totalWomenAttendedAnc);
  const numericIdx = twVals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  const numericVals = numericIdx.map((i) => rows[i]!.totalWomenAttendedAnc!);
  const madMapBySubmission = new Map<string, number>();
  const mzs = madScores(numericVals);
  numericIdx.forEach((rowIdx, vi) => {
    const mz = mzs.get(vi);
    if (mz != null) madMapBySubmission.set(rows[rowIdx]!.id, mz);
  });
  for (const r of rows) {
    const mz = madMapBySubmission.get(r.id);
    if (mz != null && Math.abs(mz) >= 3.5 && r.totalWomenAttendedAnc != null) {
      anomaliesMadFixed.push({
        submissionId: r.id,
        facilityLabel: facilityLabel(r),
        totalWomenAttendedAnc: r.totalWomenAttendedAnc,
        modifiedZ: Math.round(mz * 1000) / 1000,
      });
    }
  }

  const sectionKeys = [...new Set(PARITY_INDICATORS.map((i) => i.section))] as Array<
    (typeof PARITY_INDICATORS)[number]["section"]
  >;
  const completenessBySection = sectionKeys.map((section) => {
    const fields = sectionFieldCount.get(section) ?? 0;
    const nulls = sectionNulls.get(section) ?? 0;
    const totalCellsSection = n * fields;
    return {
      section,
      label: PARITY_SECTION_LABEL[section],
      nullRate: totalCellsSection ? nulls / totalCellsSection : 0,
      fields,
      blankCells: nulls,
      totalCells: totalCellsSection,
      filledCells: totalCellsSection - nulls,
    };
  });

  const timeSeries = [...byPeriodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      periodYear: v.y,
      periodMonth: v.m,
      submissions: v.submissions,
      sumTotalWomenAttendedAnc: v.sum,
      avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
    }));

  const sumAnc = ancValues.reduce((a, b) => a + b, 0);
  const indicatorsPerMonthlyReturn = PARITY_INDICATORS.length;
  const hasDailyReturns = rows.some((r) => (r.periodDay ?? 0) > 0);
  const labelByIndicatorKey = new Map(PARITY_INDICATORS.map((i) => [i.key, i.label]));

  const indicatorTimeSeriesMonthly: ParityAnalyticsBundle["indicatorTimeSeriesMonthly"] =
    INDICATOR_TIME_SERIES_KEYS.map((key) => ({
      key,
      label: labelByIndicatorKey.get(key) ?? key,
      points: buildIndicatorMonthlySeries(rows, key),
    }));

  const indicatorTimeSeriesDaily: ParityAnalyticsBundle["indicatorTimeSeriesDaily"] =
    INDICATOR_TIME_SERIES_KEYS.map((key) => ({
      key,
      label: labelByIndicatorKey.get(key) ?? key,
      points: buildIndicatorDailySeries(rows, key),
    }));

  return {
    generatedAt: now,
    summary: {
      submissionCount: n,
      distinctFacilities: byFacMap.size,
      distinctRegions: byRegMap.size,
      periodMin: periodKeysSorted[0] ?? null,
      periodMax: periodKeysSorted[periodKeysSorted.length - 1] ?? null,
      nullFieldRate: totalCells ? nullCells / totalCells : 0,
      nullIndicatorCells: nullCells,
      filledIndicatorCells: totalCells - nullCells,
      totalIndicatorCells: totalCells,
      indicatorsPerMonthlyReturn,
      returnsWithNonNullTotalAnc: ancValues.length,
      returnsMissingTotalAnc: n - ancValues.length,
      sumTotalWomenAttendedAnc: sumAnc,
      avgTotalWomenAttendedAnc: ancValues.length ? Math.round((sumAnc / ancValues.length) * 100) / 100 : null,
      medianTotalWomenAttendedAnc: median(ancSorted),
      p90TotalWomenAttendedAnc: quantile(ancSorted, 0.9),
      hasDailyReturns,
    },
    byDistrict: [...byDistrictMap.entries()].map(([districtId, v]) => ({
      districtId,
      name: v.name,
      submissions: v.submissions,
      sumTotalWomenAttendedAnc: v.sum,
      avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
    })),
    byBlock: [...byBlockMap.entries()].map(([blockId, v]) => ({
      blockId,
      name: v.name,
      districtId: v.districtId,
      submissions: v.submissions,
      sumTotalWomenAttendedAnc: v.sum,
      avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
    })),
    byRegion: [...byRegMap.entries()].map(([regionId, v]) => ({
      regionId,
      name: v.name,
      blockId: v.blockId,
      blockName: v.blockName,
      submissions: v.submissions,
      sumTotalWomenAttendedAnc: v.sum,
      avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
      facilityCount: v.facilities.size,
    })),
    byFacilityType: [...byFtMap.entries()].map(([facilityTypeId, v]) => ({
      facilityTypeId,
      code: v.code,
      submissions: v.submissions,
      sumTotalWomenAttendedAnc: v.sum,
      avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
    })),
    byFacility: [...byFacMap.entries()]
      .map(([facilityId, v]) => ({
        facilityId,
        name: v.name,
        facilityTypeCode: v.code,
        regionName: v.region,
        blockName: v.block,
        submissions: v.submissions,
        sumTotalWomenAttendedAnc: v.sum,
        avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
      }))
      .sort((a, b) => b.sumTotalWomenAttendedAnc - a.sumTotalWomenAttendedAnc),
    byBlockRegion: [...byBlockRegMap.values()]
      .map((v) => ({
        blockId: v.blockId,
        blockName: v.blockName,
        regionId: v.regionId,
        regionName: v.regionName,
        submissions: v.submissions,
        sumTotalWomenAttendedAnc: v.sum,
        avgTotalWomenAttendedAnc: v.submissions ? Math.round((v.sum / v.submissions) * 100) / 100 : null,
      }))
      .sort((a, b) => b.sumTotalWomenAttendedAnc - a.sumTotalWomenAttendedAnc),
    timeSeries,
    indicatorTimeSeriesMonthly,
    indicatorTimeSeriesDaily,
    completenessBySection,
    outliersIqr,
    anomaliesMad: anomaliesMadFixed,
    redundancies,
    anomaliesByBlock,
    anomaliesByFacilityType,
    qualityFlags,
  };
}
