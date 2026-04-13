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
  facilityCount: number;
  districtCount: number;
  periodStartMin: string | null;
  periodStartMax: string | null;
  filters: {
    from?: string;
    to?: string;
    district?: string;
    facilityId?: string;
  };
};

/** Row counts with each clinical section present — under current filters */
export type OverviewCorpus = {
  sectionCoverage: Record<string, number>;
  ancNumerators: {
    denominator_total_anc_registered: number;
    hiv_tested: number;
    hemoglobin_tested_4_times: number;
    blood_pressure_checked: number;
    cbc_tested: number;
    gdm_ogtt_tested: number;
    thyroid_tsh_tested: number;
    syphilis_tested: number;
    urine_routine_microscopy: number;
    blood_grouping: number;
  };
  outcomeDenominators: {
    live_births: number;
    maternal_deaths: number;
    early_neonatal_deaths_lt_24hrs: number;
    lbw_lt_2500g: number;
    preterm_births_lt_37_weeks: number;
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
  corpus: OverviewCorpus;
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
  denominatorNote?: string;
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

export type InterventionWindowStats = {
  pre_r: number | null;
  preg_r: number | null;
  live_sum: number;
  n: number;
};

export type CorrelationsResponse = {
  anemia_vs_bmi: {
    preconception: CorrelationPair;
    pregnancy: CorrelationPair;
  };
  interventionComparison: {
    method: string;
    note: string;
    cutoffPeriodStart: string | null;
    before: InterventionWindowStats;
    after: InterventionWindowStats;
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
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
    returnedCount: number;
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
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
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

export type DistrictHeatmapRow = {
  district: string;
  severity_score: number;
  screening_gap_rate: number | null;
  treatment_gap_rate: number | null;
  lbw_rate: number | null;
};

export type IntelligenceCorrelationPreset = {
  pearson: number | null;
  spearman: number | null;
  label: string;
};

export type IntelligenceCorrelationMatrixCell = {
  row: string;
  col: string;
  r: number | null;
};

export type IntelligenceBmiBand = {
  label: string;
  absolute: number;
  shareOfSection: number;
};

export type IntelligenceBubblePoint = {
  assessmentId: string;
  anc_registered: number;
  diabetes_identified: number;
  institutional_rate: number | null;
};

export type IntelligenceScatterPoint = {
  assessmentId: string;
  x: number;
  y: number;
  z: number | null;
};

export type IntelligenceRetentionPoint = {
  month: string;
  postpartum_checkup_rate: number | null;
};

export type IntelligenceNarrativeBlock = {
  what: string;
  why: string;
  next: string;
};

export type PublicHealthIntelligenceResponse = {
  meta: { assessmentCount: number; filters: OverviewMeta["filters"]; computedAt: string };
  pipelines: PipelineBundleDto[];
  sankey_links: Array<{ pipeline: string; source: string; target: string; value: number }>;
  gaps: {
    district_heatmap?: DistrictHeatmapRow[];
  };
  correlation_engine: {
    presets?: Record<string, IntelligenceCorrelationPreset>;
    extended_matrix?: IntelligenceCorrelationMatrixCell[];
  };
  cohorts: {
    retention?: IntelligenceRetentionPoint[];
  };
  time_series: {
    months?: string[];
    hiv_screening_rate?: Array<number | null>;
    hiv_ma3?: Array<number | null>;
    lbw_rate?: Array<number | null>;
    spikes?: {
      hiv_screening_indices?: number[];
      lbw_rate_indices?: number[];
    };
    trend?: {
      hiv_screening?: string;
      lbw?: string;
    };
  };
  distributions: {
    pregnancy_bmi_bands?: IntelligenceBmiBand[];
    pregnancy_anemia_severity?: IntelligenceBmiBand[];
    birth_weight_bands?: IntelligenceBmiBand[];
  };
  multivariate: {
    bubbles?: IntelligenceBubblePoint[];
    anc_ogtt_institutional?: IntelligenceScatterPoint[];
  };
  kpis: {
    screening_coverage_hiv?: number | null;
    treatment_success_proxy?: number | null;
    lbw_rate?: number | null;
    deltas_half_window?: { hiv_screening_pp?: number | null; lbw_rate_pp?: number | null };
  };
  anomalies: Record<string, unknown>;
  cross_entity: Record<string, unknown>;
  insights: {
    pipelines?: IntelligenceNarrativeBlock;
    gaps?: IntelligenceNarrativeBlock;
    correlations?: IntelligenceNarrativeBlock;
    cohorts?: IntelligenceNarrativeBlock;
    trends?: IntelligenceNarrativeBlock;
    anomalies?: IntelligenceNarrativeBlock;
  };
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

/** Comparison Lab — guided metric pairing (same filters as analytics) */
export type ComparisonMetricDto = {
  id: string;
  label: string;
  shortLabel: string;
  dataType: "numeric" | "categorical" | "binary" | "ratio";
  entity: "preconception" | "pregnancy" | "postnatal" | "infant" | "outcome";
  level: "individual" | "aggregated";
  isTimeIndex?: boolean;
};

export type ComparisonCompareResult = { ok: boolean; reason?: string };

export type ComparisonLabCatalogResponse = {
  metrics: ComparisonMetricDto[];
  compatibility: Record<string, Record<string, ComparisonCompareResult>>;
};

export type ComparisonLabRunResponse = {
  chartKind: string;
  metricA: { id: string; label: string; shortLabel: string };
  metricB: { id: string; label: string; shortLabel: string };
  metricC?: { id: string; label: string; shortLabel: string };
  nRows: number;
  stats: Record<string, unknown>;
  insight: string;
  scatter?: Array<{ assessmentId: string; x: number; y: number; z?: number }>;
  lineSeries?: Array<{ period: string; yMean: number; n: number }>;
  barGroups?: Array<{ key: string; n: number; mean: number; std: number }>;
  contingency?: {
    aKeys: string[];
    bKeys: string[];
    counts: number[][];
    chi2: number;
    df: number;
    pValue: number | null;
  } | null;
};

export type IngestionSchemaResponse = {
  sections: Array<{
    key: string;
    label: string;
    fields: Array<{
      key: string;
      type: "number" | "text";
      defaultValue: number | string | null;
    }>;
  }>;
};

export type IngestionCreateResponse = {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
};
