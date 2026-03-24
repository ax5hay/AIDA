export type IqrOutlier = { index: number; value: number; low: number; high: number };

export function detectIqrOutliers(values: number[]): IqrOutlier[] {
  if (values.length < 4) return [];
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (s.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (s[base + 1] === undefined) return s[base]!;
    return s[base]! + rest * (s[base + 1]! - s[base]!);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const out: IqrOutlier[] = [];
  values.forEach((v, index) => {
    if (v < low || v > high) out.push({ index, value: v, low, high });
  });
  return out;
}
