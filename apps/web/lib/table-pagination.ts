/** Allowed page sizes for explorer + anomaly tables (must be ≤ API caps). */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 200] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export function parseTablePageSize(raw: string | null, fallback: TablePageSize = 10): TablePageSize {
  const n = Number(raw);
  return TABLE_PAGE_SIZE_OPTIONS.includes(n as TablePageSize) ? (n as TablePageSize) : fallback;
}
