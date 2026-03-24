/** Sample mean */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sample standard deviation */
export function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  if (m === null) return null;
  const v =
    values.reduce((s, x) => s + (x - m) * (x - m), 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function zScores(values: number[]): (number | null)[] {
  const m = mean(values);
  const s = stddev(values);
  if (m === null || s === null || s === 0) return values.map(() => null);
  return values.map((x) => (x - m) / s);
}

export type AnomalyFlag = { index: number; value: number; z: number };

/** Flags points with |z| > threshold (default 3) */
export function detectAnomalies(values: number[], threshold = 3): AnomalyFlag[] {
  const zs = zScores(values);
  const out: AnomalyFlag[] = [];
  zs.forEach((z, index) => {
    if (z !== null && Math.abs(z) > threshold) {
      out.push({ index, value: values[index], z });
    }
  });
  return out;
}
