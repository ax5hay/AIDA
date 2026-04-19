import type { ParitySubmissionRow } from "@aida/parity-core";

/** Same-origin `/api/v1` is proxied by Next (see next.config); use a full URL only if the API is on another host. */
const base = () => (process.env.NEXT_PUBLIC_PARITY_API_URL ?? "/api/v1").replace(/\/$/, "");

async function parseJson<T>(res: Response, ctx: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${ctx}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type TaxonomyDistrict = { id: string; name: string; sortOrder: number };
export type TaxonomyBlock = { id: string; name: string; districtId: string; district: TaxonomyDistrict };
export type TaxonomyFacilityType = { id: string; code: string; label: string; sortOrder: number };
export type TaxonomyRegion = {
  id: string;
  name: string;
  sortOrder: number;
  blockId: string;
  block: TaxonomyBlock;
};
export type TaxonomyFacility = {
  id: string;
  name: string;
  sortOrder: number;
  regionId: string;
  facilityTypeId: string;
  facilityType: TaxonomyFacilityType;
  region: { id: string; name: string; block: { id: string; name: string } };
};

export async function fetchDistricts(): Promise<TaxonomyDistrict[]> {
  const res = await fetch(`${base()}/parity/taxonomy/districts`);
  return parseJson(res, "districts");
}

export async function fetchBlocks(districtId?: string): Promise<TaxonomyBlock[]> {
  const q = districtId ? `?districtId=${encodeURIComponent(districtId)}` : "";
  const res = await fetch(`${base()}/parity/taxonomy/blocks${q}`);
  return parseJson(res, "blocks");
}

export async function fetchFacilityTypes(): Promise<TaxonomyFacilityType[]> {
  const res = await fetch(`${base()}/parity/taxonomy/facility-types`);
  return parseJson(res, "facility-types");
}

export async function fetchRegions(blockId?: string): Promise<TaxonomyRegion[]> {
  const q = blockId ? `?blockId=${encodeURIComponent(blockId)}` : "";
  const res = await fetch(`${base()}/parity/taxonomy/regions${q}`);
  return parseJson(res, "regions");
}

export async function fetchFacilities(regionId?: string): Promise<TaxonomyFacility[]> {
  const q = regionId ? `?regionId=${encodeURIComponent(regionId)}` : "";
  const res = await fetch(`${base()}/parity/taxonomy/facilities${q}`);
  return parseJson(res, "facilities");
}

export async function postDistrict(name: string) {
  const res = await fetch(`${base()}/parity/taxonomy/districts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJson<TaxonomyDistrict>(res, "add district");
}

export async function postBlock(districtId: string, name: string) {
  const res = await fetch(`${base()}/parity/taxonomy/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ districtId, name }),
  });
  return parseJson<TaxonomyBlock>(res, "add block");
}

export async function postFacilityType(code: string, label: string) {
  const res = await fetch(`${base()}/parity/taxonomy/facility-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, label }),
  });
  return parseJson<TaxonomyFacilityType>(res, "add facility type");
}

export async function postRegion(blockId: string, name: string) {
  const res = await fetch(`${base()}/parity/taxonomy/regions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockId, name }),
  });
  return parseJson<TaxonomyRegion>(res, "add region");
}

export async function postFacility(regionId: string, facilityTypeId: string, name: string) {
  const res = await fetch(`${base()}/parity/taxonomy/facilities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regionId, facilityTypeId, name }),
  });
  return parseJson<TaxonomyFacility>(res, "add facility");
}

export async function postSubmission(body: Record<string, unknown>) {
  const res = await fetch(`${base()}/parity/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  return res.json() as Promise<{
    submission: unknown;
    warnings: unknown[];
    analytics: unknown;
  }>;
}

export async function fetchAnalytics(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`${base()}/parity/analytics?${qs.toString()}`);
  return parseJson(res, "analytics");
}

export type SubmissionListRow = {
  id: string;
  districtName: string;
  blockName: string;
  regionName: string;
  facilityName: string;
  facilityTypeCode: string;
  periodYear: number;
  periodMonth: number;
  /** 0 = whole-month return; 1–31 = calendar day. */
  periodDay: number;
  totalWomenAttendedAnc: number | null;
  remarks: string | null;
};

export async function fetchSubmissionsPage(
  params: Record<string, string | number | undefined>,
): Promise<{
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number; hasMore: boolean };
  rows: SubmissionListRow[];
}> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const res = await fetch(`${base()}/parity/submissions?${qs.toString()}`);
  return parseJson(res, "submissions");
}

/** Full monthly return (every indicator) for the observation detail view. */
export async function fetchSubmission(id: string): Promise<ParitySubmissionRow> {
  const res = await fetch(`${base()}/parity/submissions/${encodeURIComponent(id)}`);
  return parseJson(res, "submission");
}
