import type { AnalyticsFilters } from "./query-params";
import { filtersToSearchParams } from "./query-params";
import type {
  AiIntelligenceInsightsResponse,
  AnomaliesResponse,
  AssessmentDetailResponse,
  ClinicalCrossSectionResponse,
  ComparisonLabCatalogResponse,
  ComparisonLabRunResponse,
  CorrelationsResponse,
  DistrictRollupRow,
  ExplorerResponse,
  FacilityDto,
  OverviewResponse,
  PublicConfigResponse,
  DecisionSupportResponse,
  PublicHealthIntelligenceResponse,
  SectionResponse,
  IngestionSchemaResponse,
  IngestionCreateResponse,
} from "./types";

const base = () => process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

function q(filters?: AnalyticsFilters): string {
  return filtersToSearchParams(filters ?? {});
}

async function parseJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${label} ${res.status}: ${text.slice(0, 200)}`);
  }
  const raw = await res.text();
  if (!raw) {
    throw new Error(`${label}: empty response body`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label}: invalid JSON response`);
  }
}

export async function getOverview(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/overview${q(filters)}`, { signal, cache: "no-store" });
  return parseJson<OverviewResponse>(res, "overview");
}

export async function getIntelligence(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/intelligence${q(filters)}`, { signal, cache: "no-store" });
  return parseJson<PublicHealthIntelligenceResponse>(res, "intelligence");
}

export async function getDecisionSupport(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/decision-support${q(filters)}`, { signal, cache: "no-store" });
  return parseJson<DecisionSupportResponse>(res, "decision-support");
}

export async function getSection(section: string, filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/section/${encodeURIComponent(section)}${q(filters)}`, {
    signal,
    cache: "no-store",
  });
  return parseJson<SectionResponse>(res, `section/${section}`);
}

export async function getCorrelations(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/correlations${q(filters)}`, { signal, cache: "no-store" });
  return parseJson<CorrelationsResponse>(res, "correlations");
}

export async function getDistrictRollup(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/district-rollup${q(filters)}`, { signal, cache: "no-store" });
  return parseJson<DistrictRollupRow[]>(res, "district-rollup");
}

export async function getClinicalCrossSection(filters?: AnalyticsFilters, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/clinical-cross-section${q(filters)}`, {
    signal,
    cache: "no-store",
  });
  return parseJson<ClinicalCrossSectionResponse>(res, "clinical-cross-section");
}

export async function getExplorer(
  filters?: AnalyticsFilters,
  opts?: { page?: number; pageSize?: number; signal?: AbortSignal },
) {
  const qs = new URLSearchParams(filtersToSearchParams(filters ?? {}));
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.pageSize) qs.set("pageSize", String(opts.pageSize));
  const res = await fetch(`${base()}/analytics/explorer?${qs.toString()}`, {
    signal: opts?.signal,
    cache: "no-store",
  });
  return parseJson<ExplorerResponse>(res, "explorer");
}

export async function getAssessmentDetail(id: string, signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/assessments/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  return parseJson<AssessmentDetailResponse>(res, "assessment");
}

export async function getFacilities(signal?: AbortSignal) {
  const res = await fetch(`${base()}/facilities`, { signal, cache: "no-store" });
  return parseJson<FacilityDto[]>(res, "facilities");
}

export async function getDistricts(signal?: AbortSignal) {
  const res = await fetch(`${base()}/facilities/districts`, { signal, cache: "no-store" });
  return parseJson<string[]>(res, "districts");
}

export async function getPublicConfig(signal?: AbortSignal) {
  const res = await fetch(`${base()}/config`, { signal, cache: "no-store" });
  return parseJson<PublicConfigResponse>(res, "config");
}

export async function getAiStatus(signal?: AbortSignal) {
  const res = await fetch(`${base()}/ai/status`, { signal, cache: "no-store" });
  return parseJson<{ enabled: boolean }>(res, "ai status");
}

export async function postAiInsights(
  snapshot: unknown,
  opts?: { model?: string; signal?: AbortSignal },
) {
  const res = await fetch(`${base()}/ai/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, model: opts?.model }),
    signal: opts?.signal,
  });
  return parseJson<{ enabled: boolean; text: string | null }>(res, "ai insights");
}

export async function postAiIntelligenceInsights(
  snapshot: unknown,
  opts?: { model?: string; signal?: AbortSignal },
) {
  const res = await fetch(`${base()}/ai/intelligence-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, model: opts?.model }),
    signal: opts?.signal,
  });
  return parseJson<AiIntelligenceInsightsResponse>(res, "ai intelligence insights");
}

export async function getAiModels(signal?: AbortSignal) {
  const res = await fetch(`${base()}/ai/models`, { signal, cache: "no-store" });
  return parseJson<{ data: Array<{ id: string }> }>(res, "ai models");
}

export async function getComparisonLabCatalog(signal?: AbortSignal) {
  const res = await fetch(`${base()}/analytics/comparison-lab/catalog`, { signal, cache: "no-store" });
  return parseJson<ComparisonLabCatalogResponse>(res, "comparison-lab catalog");
}

export async function getComparisonLabRun(
  opts: { metricA: string; metricB: string; metricC?: string; filters?: AnalyticsFilters },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams(filtersToSearchParams(opts.filters ?? {}));
  qs.set("metricA", opts.metricA);
  qs.set("metricB", opts.metricB);
  if (opts.metricC) qs.set("metricC", opts.metricC);
  const res = await fetch(`${base()}/analytics/comparison-lab/run?${qs.toString()}`, {
    signal,
    cache: "no-store",
  });
  return parseJson<ComparisonLabRunResponse>(res, "comparison-lab run");
}

export async function getAnomalies(
  metric: "live_births" | "maternal_deaths",
  filters?: AnalyticsFilters,
  opts?: { page?: number; pageSize?: number; signal?: AbortSignal },
) {
  const qs = new URLSearchParams();
  qs.set("metric", metric);
  if (filters?.from) qs.set("from", filters.from);
  if (filters?.to) qs.set("to", filters.to);
  if (filters?.district) qs.set("district", filters.district);
  if (filters?.facilityId) qs.set("facilityId", filters.facilityId);
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.pageSize) qs.set("pageSize", String(opts.pageSize));
  const res = await fetch(`${base()}/analytics/anomalies?${qs.toString()}`, {
    signal: opts?.signal,
    cache: "no-store",
  });
  return parseJson<AnomaliesResponse>(res, "anomalies");
}

export async function getIngestionSchema(signal?: AbortSignal) {
  const res = await fetch(`${base()}/ingestion/schema`, { signal, cache: "no-store" });
  return parseJson<IngestionSchemaResponse>(res, "ingestion schema");
}

export async function postIngestionAssessment(
  payload: Record<string, unknown>,
  opts?: { signal?: AbortSignal },
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const maybeKey = process.env.NEXT_PUBLIC_INGESTION_API_KEY?.trim();
  if (maybeKey) headers["x-ingestion-key"] = maybeKey;
  const res = await fetch(`${base()}/ingestion/assessments`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: opts?.signal,
  });
  return parseJson<IngestionCreateResponse>(res, "ingestion create");
}

export type { AnalyticsFilters } from "./query-params";
export type * from "./types";
