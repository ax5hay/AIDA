/** Full English month names (index 0 = January). */
export const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthNameEn(month1to12: number): string {
  const i = month1to12 - 1;
  if (i < 0 || i > 11) return String(month1to12);
  return MONTH_NAMES_EN[i]!;
}

/** e.g. January 2026 */
export function formatYearMonth(year: number, month1to12: number): string {
  return `${monthNameEn(month1to12)} ${year}`;
}

/** Parse `YYYY-MM` from analytics API → March 2026 */
export function formatPeriodKey(period: string): string {
  const [ys, ms] = period.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return period;
  return formatYearMonth(y, m);
}

/** Sort key from API: `YYYY-MM-00` = whole month, `YYYY-MM-DD` = calendar day. */
export function formatParityAnalyticsPeriodKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.endsWith("-00")) {
    return formatPeriodKey(trimmed.slice(0, 7));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      return `${d} ${monthNameEn(mo)} ${y}`;
    }
  }
  return trimmed;
}

/** One saved return: monthly (day 0) or daily (1–31). */
export function formatSubmissionPeriod(year: number, month1to12: number, periodDay: number): string {
  if (periodDay <= 0) return formatYearMonth(year, month1to12);
  return `${periodDay} ${monthNameEn(month1to12)} ${year}`;
}
