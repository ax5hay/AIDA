export type ExplorerFilters = {
  from?: string;
  to?: string;
  district?: string;
  facilityId?: string;
};

const DEFAULT_MAX_FILTER_WINDOW_DAYS = Number(process.env.MAX_FILTER_WINDOW_DAYS ?? 365);

function normalizeString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toValidDate(value: string, label: "from" | "to"): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }
  return date;
}

/**
 * Centralized filter validation to prevent invalid dates and runaway windows.
 */
export function parseExplorerFilters(
  from?: string,
  to?: string,
  district?: string,
  facilityId?: string,
): ExplorerFilters {
  const clean: ExplorerFilters = {
    from: normalizeString(from),
    to: normalizeString(to),
    district: normalizeString(district),
    facilityId: normalizeString(facilityId),
  };

  if (clean.from) toValidDate(clean.from, "from");
  if (clean.to) toValidDate(clean.to, "to");
  if (clean.from && clean.to) {
    const fromDate = new Date(clean.from);
    const toDate = new Date(clean.to);
    if (fromDate > toDate) {
      throw new Error("from must be earlier than or equal to to");
    }
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays > DEFAULT_MAX_FILTER_WINDOW_DAYS) {
      throw new Error(`Date window too large. Max ${DEFAULT_MAX_FILTER_WINDOW_DAYS} days.`);
    }
  }

  return clean;
}
