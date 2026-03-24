/** API contracts — aligned with NestJS analytics / metrics / config responses */

export type ValidationIssue = {
  code: string;
  message: string;
  assessmentId?: string;
};

export type ScreeningRates = {
  screening_rate_blood_grouping: number | null;
  screening_rate_cbc: number | null;
  screening_rate_hiv: number | null;
  screening_rate_syphilis: number | null;
  screening_rate_urine: number | null;
  screening_rate_tsh: number | null;
  screening_rate_ogtt: number | null;
  screening_rate_bp: number | null;
  screening_rate_hgb_4x: number | null;
};

export type ManagementGaps = {
  preconception_gap: Record<string, number>;
  pregnancy_gap: Record<string, number>;
};

export type OverviewMeta = {
  assessmentCount: number;
  filters: {
    from?: string;
    to?: string;
    district?: string;
    facilityId?: string;
  };
};

export type OverviewKpis = {
  screening_rates: ScreeningRates;
  management_gap: ManagementGaps;
  mortality_rate_maternal_per_live_birth: number | null;
  early_neonatal_mortality_rate_per_live_birth: number | null;
  institutional_delivery_ratio: number | null;
  lbw_rate: number | null;
  preterm_rate: number | null;
};

export type OverviewFunnel = {
  preconception: {
    identified_total: number;
    managed_total: number;
    interventions: Record<string, number>;
  };
  pregnancy: {
    registered_total: number;
    identified_total: number;
    managed_total: number;
  };
  outcomes: {
    live_births: number;
    maternal_deaths: number;
    early_neonatal_deaths_lt_24hrs: number;
  };
};

export type OverviewResponse = {
  meta: OverviewMeta;
  kpis: OverviewKpis;
  funnel: OverviewFunnel;
  alerts: Array<{ severity: "info" | "warning" | "critical"; action: string }>;
  validation: { issues: ValidationIssue[] };
};

export type FieldMetric = {
  field: string;
  absolute: number;
  pctOfDenominator: number | null;
  denominator: number | null;
};

export type ComparativeSlice = {
  label: string;
  absolute: number;
  shareOfSection: number;
};

export type TimeSeriesPoint = {
  periodStart: string;
  absolute: number;
  pctOfDenominator: number | null;
};

export type SectionResponse = {
  section: string;
  totals: Record<string, number>;
  fieldMetrics: FieldMetric[];
  comparativeDistribution: ComparativeSlice[];
  timeSeries: Array<{ field: string; points: TimeSeriesPoint[] }>;
};

export type CorrelationSeriesPoint = {
  assessmentId: string;
  anemia_identified: number;
  bmi_band_total: number;
};

export type CorrelationPair = {
  r: number | null;
  series: CorrelationSeriesPoint[];
};

export type CorrelationMatrixCell = {
  row: string;
  col: string;
  r: number | null;
};

export type CorrelationsResponse = {
  anemia_vs_bmi: {
    preconception: CorrelationPair;
    pregnancy: CorrelationPair;
  };
  matrix: CorrelationMatrixCell[];
};

export type ExplorerRow = {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  facility: {
    id: string;
    name: string;
    district: string;
    state: string;
  };
  remarks: {
    hasObservational: boolean;
    hasRespondent: boolean;
    observationalLength: number;
    respondentLength: number;
  };
  documents: {
    filledSlots: number;
    slots: Array<{ slot: number; key: string | null }>;
  };
  preview: {
    total_anc_registered: number | null;
    live_births: number | null;
    maternal_deaths: number | null;
  };
};

export type ExplorerResponse = {
  meta: {
    totalCount: number;
    filters: OverviewMeta["filters"];
  };
  rows: ExplorerRow[];
};

export type FacilityDto = {
  id: string;
  name: string;
  district: string;
  state: string;
};

export type PublicConfigResponse = {
  apiVersion: string;
  webOrigin: string | null;
  aiInsightsEnabled: boolean;
  aiProviderReady: boolean;
  lmStudioConfigured: boolean;
  defaultLmStudioModel: string;
  defaultApiBase: string;
};

export type DistrictRollupRow = {
  district: string;
  state: string;
  assessments: number;
  live_births: number;
  maternal_deaths: number;
  early_neonatal_deaths: number;
  anc_registered_total: number;
  hiv_tested_total: number;
  hemoglobin_4x_total: number;
};

/** Paired fields from the same assessment row(s) for interpretable charts */
export type ClinicalCrossSectionResponse = {
  ancHgb: Array<{
    assessmentId: string;
    total_anc_registered: number;
    hemoglobin_tested_4_times: number;
  }>;
  ancHiv: Array<{
    assessmentId: string;
    total_anc_registered: number;
    hiv_tested: number;
  }>;
  pregAnemiaVsLive: Array<{
    assessmentId: string;
    pregnancy_anemia_screened: number;
    live_births: number;
  }>;
  preconceptionAnemiaIdVsManaged: Array<{
    assessmentId: string;
    preconception_anemia_identified: number;
    preconception_anemia_managed: number;
  }>;
};

export type AnomaliesResponse = {
  metric: "live_births" | "maternal_deaths";
  /** Z-score threshold used for flagging (e.g. 2.5) */
  thresholdZ: number;
  points: Array<{
    index: number;
    value: number;
    z: number;
    assessmentId?: string;
    facility?: string;
  }>;
};

export type AssessmentDetailResponse = {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  facility: FacilityDto;
  preconceptionWomenIdentified: Record<string, number> | null;
  preconceptionInterventions: Record<string, number> | null;
  preconceptionWomenManaged: Record<string, number> | null;
  pregnantWomenRegisteredAndScreened: Record<string, number> | null;
  pregnantWomenIdentified: Record<string, number> | null;
  pregnantWomenManaged: Record<string, number> | null;
  highRiskPregnancy: Record<string, number> | null;
  deliveryAndOutcomes: Record<string, number> | null;
  infants0To24Months: Record<string, number> | null;
  postnatalWomen: Record<string, number> | null;
  remarks: { observational_remarks: string; respondent_remarks: string } | null;
  documents: Record<string, string | null> | null;
  validationIssues: ValidationIssue[];
};

/** `/analytics/intelligence` — extended public health intelligence payload */
export type FunnelStageMetricDto = {
  id: string;
  label: string;
  count: number;
  conversionFromFirst: number | null;
  dropOffFromPrior: number | null;
  retainedFromPrior: number | null;
  nonMonotonic: boolean;
};

export type PipelineBundleDto = {
  key: string;
  label: string;
  stages: FunnelStageMetricDto[];
  bottleneckIndex: number | null;
  bottleneckId: string | null;
};

export type PublicHealthIntelligenceResponse = {
  meta: { assessmentCount: number; filters: OverviewMeta["filters"]; computedAt: string };
  pipelines: PipelineBundleDto[];
  sankey_links: Array<{ pipeline: string; source: string; target: string; value: number }>;
  gaps: Record<string, unknown>;
  correlation_engine: Record<string, unknown>;
  cohorts: Record<string, unknown>;
  time_series: Record<string, unknown>;
  distributions: Record<string, unknown>;
  multivariate: Record<string, unknown>;
  kpis: Record<string, unknown>;
  anomalies: Record<string, unknown>;
  cross_entity: Record<string, unknown>;
  insights: Record<string, unknown>;
};

export type AiIntelligenceInsightsResponse = {
  enabled: boolean;
  deterministic: unknown;
  llm: string | null;
  llmError?: string;
};

/** `/analytics/decision-support` — decision layer (actions, score, alerts, what-if, quality, benchmarks, story) */
export type DecisionSupportResponse = {
  meta: { filters: OverviewMeta["filters"]; computedAt: string; refresh_hint_sec: number };
  program_health_score: {
    score: number;
    breakdown: { coverage: number; outcomes: number; gap_equity: number };
    notes: string[];
  };
  top_actions: Array<{ rank: number; title: string; rationale: string; signal: string }>;
  alert_center: Array<{
    id: string;
    severity: string;
    title: string;
    detail: string;
    source: string;
  }>;
  what_if: Array<{
    id: string;
    label: string;
    assumption: string;
    projected: { hiv_screening_rate: number | null; lbw_rate: number | null; maternal_mortality_rate: number | null };
  }>;
  data_quality: {
    missing_core_sections_pct: number;
    validation_issue_count: number;
    suspicious_assessment_flags: number;
    inconsistent_rows_hint: string;
  };
  benchmarking: Record<string, unknown>;
  story_mode: Array<{ step: number; title: string; narrative: string }>;
  what_if_disclaimer: string;
};
