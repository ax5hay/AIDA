export type FieldMetric = {
  field: string;
  absolute: number;
  /** Percentage vs denominator when applicable (0–100); null if no denominator */
  pctOfDenominator: number | null;
  denominator: number | null;
};

export type TimeSeriesPoint = {
  periodStart: string;
  absolute: number;
  pctOfDenominator: number | null;
};

export type ComparativeSlice = {
  label: string;
  absolute: number;
  shareOfSection: number;
};

export function sumFields<K extends string>(
  rows: Array<Partial<Record<K, number | null | undefined>>>,
  keys: readonly K[],
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = 0;
  for (const row of rows) {
    for (const k of keys) {
      const v = row[k];
      out[k] += typeof v === "number" && !Number.isNaN(v) ? v : 0;
    }
  }
  return out;
}

export function fieldMetrics<K extends string>(
  totals: Record<K, number>,
  keys: readonly K[],
  denominator: number | null,
): FieldMetric[] {
  return keys.map((field) => ({
    field,
    absolute: totals[field],
    pctOfDenominator:
      denominator !== null && denominator > 0
        ? (totals[field] / denominator) * 100
        : null,
    denominator,
  }));
}

export function distributionShares<K extends string>(
  totals: Record<K, number>,
  keys: readonly K[],
): ComparativeSlice[] {
  const sectionSum = keys.reduce((s, k) => s + totals[k], 0);
  return keys.map((label) => ({
    label,
    absolute: totals[label],
    shareOfSection: sectionSum > 0 ? (totals[label] / sectionSum) * 100 : 0,
  }));
}

export function buildTimeSeries<K extends string>(
  buckets: Array<{ periodStart: Date; rows: Array<Partial<Record<K, number>>> }>,
  field: K,
  denominatorPerBucket: (bucketIndex: number) => number | null,
): TimeSeriesPoint[] {
  return buckets.map((b, i) => {
    const abs = b.rows.reduce((s, r) => {
      const v = r[field];
      return s + (typeof v === "number" ? v : 0);
    }, 0);
    const d = denominatorPerBucket(i);
    return {
      periodStart: b.periodStart.toISOString(),
      absolute: abs,
      pctOfDenominator: d !== null && d > 0 ? (abs / d) * 100 : null,
    };
  });
}
