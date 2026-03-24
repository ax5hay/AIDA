import { correlationCoefficient } from "@aida/analytics-engine";

export type CorrelationCell = { row: string; col: string; r: number | null };

/** Pairwise Pearson correlation matrix for named series */
export function correlationMatrix(
  series: Record<string, number[]>,
): CorrelationCell[] {
  const names = Object.keys(series);
  const cells: CorrelationCell[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      const a = series[names[i]];
      const b = series[names[j]];
      const r = i === j ? 1 : correlationCoefficient(a, b);
      cells.push({ row: names[i], col: names[j], r });
    }
  }
  return cells;
}
