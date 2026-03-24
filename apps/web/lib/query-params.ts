/** Mirrors `ExplorerFilters` on the API — single filter model for the whole app */
export type AnalyticsFilters = {
  from?: string;
  to?: string;
  district?: string;
  facilityId?: string;
};

export function parseFiltersFromSearchParams(searchParams: URLSearchParams): AnalyticsFilters {
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  const district = searchParams.get("district")?.trim();
  const facilityId = searchParams.get("facilityId")?.trim();
  return {
    from: from || undefined,
    to: to || undefined,
    district: district || undefined,
    facilityId: facilityId || undefined,
  };
}

export function filtersToSearchParams(filters: AnalyticsFilters): string {
  const p = new URLSearchParams();
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.district) p.set("district", filters.district);
  if (filters.facilityId) p.set("facilityId", filters.facilityId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function filtersKey(filters: AnalyticsFilters): string {
  return [filters.from ?? "", filters.to ?? "", filters.district ?? "", filters.facilityId ?? ""].join(
    "|",
  );
}

/** Append current filter query string for shareable drill-down links */
export function withQueryString(path: string, qs: string): string {
  if (!qs) return path;
  return `${path}?${qs}`;
}
