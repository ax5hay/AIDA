/**
 * Reference documentation — aligned to packages/db/prisma/schema.prisma and API usage.
 * Field names MUST match the DB (schema forbids renames).
 */

export type HelpField = {
  name: string;
  meaning: string;
  usedIn: string;
};

export const HELP_INTRO = {
  title: "How AIDA uses your data",
  paragraphs: [
    "Each **ChcAssessment** row is one reporting window (typically monthly) for one **Facility**. Count columns are non‑negative integers: they sum women, events, or tests recorded in that window for that facility—unless the field is explicitly a rate computed in the analytics engine.",
    "Whenever you see a **percentage in Overview or Analytics**, look for the **denominator line** under the headline value: ANC screening rates use **Σ total_anc_registered** across filtered rows; mortality and LBW/preterm use **live births**; distribution bars under a section use **that section’s internal total** (not ANC unless stated).",
    "Optional **section relations** (e.g. `preconceptionWomenIdentified`) may be missing on a row. Analytics treats a missing section as **no contribution** for that section’s sums for that assessment (equivalent to zero counts).",
    "The **analytics engine** (`@aida/analytics-engine`) aggregates rows that match URL filters (`from`, `to` on `periodStart`, optional `district`, `facilityId`). It sums fields across rows, derives ratios where formulas are fixed in code, and runs logical validation. The **API** (`AnalyticsService`) exposes overview KPIs, per‑section rollups, correlations, district rollups, scatters, explorer listings, assessment detail, the extended **`/analytics/intelligence`** bundle, and **`/analytics/decision-support`** (prioritized actions, health score, alerts, what‑if, quality, benchmarks, story mode).",
    "**Field names are frozen** (see schema comment). This page documents what each column represents in public‑health terms and where it appears in the product.",
  ],
};

export const HELP_FILTERS: HelpField[] = [
  {
    name: "from / to",
    meaning: "ISO date bounds applied to ChcAssessment.periodStart (inclusive range via Prisma where).",
    usedIn: "All analytics routes; URL query params preserved for shareable links.",
  },
  {
    name: "district",
    meaning: "Filters assessments by Facility.district.",
    usedIn: "Same as above.",
  },
  {
    name: "facilityId",
    meaning: "Narrows to a single facility’s assessments.",
    usedIn: "Same as above.",
  },
];

export const HELP_FACILITY: HelpField[] = [
  { name: "id", meaning: "Stable facility identifier (cuid).", usedIn: "Join key; Explorer & detail views." },
  { name: "name", meaning: "Facility / reporting unit display name.", usedIn: "Explorer, assessment detail, anomaly labels." },
  { name: "district", meaning: "Administrative district for rollups and filters.", usedIn: "District rollup, filter bar, tables." },
  { name: "state", meaning: "State/region (optional string).", usedIn: "District rollup payload; facility context." },
  { name: "createdAt", meaning: "Record creation time.", usedIn: "DB / ops only (not shown in analytics UI)." },
];

export const HELP_CHC_ASSESSMENT: HelpField[] = [
  { name: "id", meaning: "Primary key for one assessment (cuid).", usedIn: "Explorer links, correlation series keys, anomaly pointers." },
  { name: "facilityId", meaning: "FK to Facility.", usedIn: "All joins and explorer rows." },
  { name: "periodStart", meaning: "Start of reporting window (stored as DateTime).", usedIn: "Filter window, monthly time buckets for section charts." },
  { name: "periodEnd", meaning: "End of reporting window.", usedIn: "Explorer table, assessment detail." },
  { name: "createdAt / updatedAt", meaning: "Audit timestamps.", usedIn: "DB; not analytics KPIs." },
];

export const HELP_PRECONCEPTION_IDENTIFIED: HelpField[] = [
  { name: "rti_sti", meaning: "Women identified with RTI/STI in preconception cohort.", usedIn: "Preconception page; overview funnel & gaps; section totals." },
  { name: "tb", meaning: "Tuberculosis (identified).", usedIn: "Same." },
  { name: "epilepsy", meaning: "Epilepsy (identified).", usedIn: "Same." },
  { name: "syphilis", meaning: "Syphilis (identified).", usedIn: "Same." },
  { name: "hypothyroidism_tsh_gt_5_5", meaning: "Hypothyroidism per TSH > 5.5 (identified).", usedIn: "Same." },
  { name: "hyperthyroidism_tsh_lt_0_4", meaning: "Hyperthyroidism per TSH < 0.4 (identified).", usedIn: "Same." },
  { name: "hypertension", meaning: "Hypertension (identified).", usedIn: "Same." },
  { name: "hypotension", meaning: "Hypotension (identified).", usedIn: "Same." },
  { name: "prediabetes_hba1c_5_7_to_6_4", meaning: "Prediabetes HbA1c 5.7–6.4% (identified).", usedIn: "Same." },
  { name: "diabetes_hba1c_gte_6_5", meaning: "Diabetes HbA1c ≥ 6.5% (identified).", usedIn: "Same." },
  { name: "bmi_lt_16", meaning: "BMI under 16 (identified).", usedIn: "Same; BMI band part of correlation anemia_vs_bmi preconception." },
  { name: "bmi_16_to_18_49", meaning: "BMI 16–18.49 (identified).", usedIn: "Same." },
  { name: "bmi_18_5_to_lt_21", meaning: "BMI 18.5 to < 21 (identified).", usedIn: "Same." },
  { name: "severe_anemia_hb_lt_8", meaning: "Severe anemia Hb < 8 g/dL (identified).", usedIn: "Same; summed into anemia series for correlations; preconception scatter with managed." },
  { name: "moderate_anemia_hb_8_to_11_99", meaning: "Moderate anemia Hb 8–11.99 (identified).", usedIn: "Same." },
  { name: "depressive_symptoms", meaning: "Depressive symptoms flagged (identified).", usedIn: "Same." },
];

export const HELP_PRECONCEPTION_INTERVENTIONS: HelpField[] = [
  { name: "ifa_given", meaning: "IFA distributed (preconception).", usedIn: "Preconception page; overview funnel.interventions; section charts." },
  { name: "nutrition_counselling", meaning: "Nutrition counselling sessions/counts.", usedIn: "Same." },
  { name: "wash_counselling", meaning: "WASH counselling.", usedIn: "Same." },
];

/** Same columns as PreconceptionWomenIdentified — “managed” cohort. */
export const HELP_PRECONCEPTION_MANAGED: HelpField[] = [
  { name: "rti_sti", meaning: "Women with RTI/STI in preconception cohort receiving management.", usedIn: "Preconception page; management_gap.preconception_gap; validateManagedVsIdentified; scatter: anemia managed vs identified." },
  { name: "tb", meaning: "Tuberculosis — managed.", usedIn: "Same." },
  { name: "epilepsy", meaning: "Epilepsy — managed.", usedIn: "Same." },
  { name: "syphilis", meaning: "Syphilis — managed.", usedIn: "Same." },
  { name: "hypothyroidism_tsh_gt_5_5", meaning: "Hypothyroidism (TSH > 5.5) — managed.", usedIn: "Same." },
  { name: "hyperthyroidism_tsh_lt_0_4", meaning: "Hyperthyroidism (TSH < 0.4) — managed.", usedIn: "Same." },
  { name: "hypertension", meaning: "Hypertension — managed.", usedIn: "Same." },
  { name: "hypotension", meaning: "Hypotension — managed.", usedIn: "Same." },
  { name: "prediabetes_hba1c_5_7_to_6_4", meaning: "Prediabetes HbA1c band — managed.", usedIn: "Same." },
  { name: "diabetes_hba1c_gte_6_5", meaning: "Diabetes HbA1c — managed.", usedIn: "Same." },
  { name: "bmi_lt_16", meaning: "BMI < 16 — managed.", usedIn: "Same." },
  { name: "bmi_16_to_18_49", meaning: "BMI 16–18.49 — managed.", usedIn: "Same." },
  { name: "bmi_18_5_to_lt_21", meaning: "BMI 18.5 to < 21 — managed.", usedIn: "Same." },
  { name: "severe_anemia_hb_lt_8", meaning: "Severe anemia Hb < 8 — managed.", usedIn: "Same; scatter sums with identified." },
  { name: "moderate_anemia_hb_8_to_11_99", meaning: "Moderate anemia Hb 8–11.99 — managed.", usedIn: "Same." },
  { name: "depressive_symptoms", meaning: "Depressive symptoms — managed.", usedIn: "Same." },
];

export const HELP_PREGNANT_REGISTERED_SCREENED: HelpField[] = [
  {
    name: "total_anc_registered",
    meaning: "Total pregnant women registered for ANC in the window — **central denominator** for screening coverage.",
    usedIn: "Overview screening_rates; section metrics %; validateScreeningVsRegistered; district rollup ANC sums; clinical cross-section scatters; Explorer preview.",
  },
  { name: "blood_grouping", meaning: "Women with blood grouping done.", usedIn: "screening_rate_blood_grouping; Pregnancy page; Analytics suite." },
  { name: "cbc_tested", meaning: "CBC tests completed.", usedIn: "screening_rate_cbc; same surfaces." },
  { name: "hiv_tested", meaning: "HIV tests completed.", usedIn: "screening_rate_hiv; alerts if < 85%; district HIV rate; ancHiv scatter." },
  { name: "syphilis_tested", meaning: "Syphilis tests completed.", usedIn: "screening_rate_syphilis." },
  { name: "urine_routine_microscopy", meaning: "Urine routine/microscopy done.", usedIn: "screening_rate_urine." },
  { name: "thyroid_tsh_tested", meaning: "Thyroid TSH tested.", usedIn: "screening_rate_tsh." },
  { name: "gdm_ogtt_tested", meaning: "GDM OGTT tested.", usedIn: "screening_rate_ogtt." },
  { name: "blood_pressure_checked", meaning: "BP measured.", usedIn: "screening_rate_bp." },
  { name: "height_measured_first_trimester", meaning: "Height measured in first trimester (count).", usedIn: "Section totals & time series; not a named screening_rate in derived.ts." },
  { name: "weight_measured_first_trimester", meaning: "Weight measured in first trimester.", usedIn: "Same." },
  { name: "weight_measured_all_trimesters", meaning: "Weight measured across trimesters (as reported).", usedIn: "Same." },
  { name: "phq2_each_trimester", meaning: "PHQ‑2 per trimester (mental health screen).", usedIn: "Same." },
  { name: "hemoglobin_tested_4_times", meaning: "Hb tested four times (anemia surveillance).", usedIn: "screening_rate_hgb_4x; alerts if < 75%; district rollup; ancHgb scatter." },
];

export const HELP_PREGNANT_IDENTIFIED: HelpField[] = [
  { name: "hiv", meaning: "Pregnant women identified with HIV.", usedIn: "Pregnancy page; pregnancy_gap; section analytics." },
  { name: "syphilis", meaning: "Syphilis (pregnancy).", usedIn: "Same." },
  { name: "hypothyroidism", meaning: "Hypothyroidism.", usedIn: "Same." },
  { name: "hyperthyroidism", meaning: "Hyperthyroidism.", usedIn: "Same." },
  { name: "hypertension", meaning: "Hypertension.", usedIn: "Same." },
  { name: "hypotension", meaning: "Hypotension.", usedIn: "Same." },
  { name: "diabetes_mellitus", meaning: "Diabetes mellitus.", usedIn: "Same." },
  { name: "bmi_lt_18_5", meaning: "BMI < 18.5 (underweight).", usedIn: "Same; anemia_vs_bmi pregnancy BMI band sum." },
  { name: "bmi_lt_25", meaning: "BMI-related flag as per source form (field name fixed in schema).", usedIn: "Same; BMI band sum for correlations." },
  { name: "inadequate_gestational_weight_gain", meaning: "Inadequate gestational weight gain.", usedIn: "Same." },
  { name: "severe_anemia_hb_lt_7", meaning: "Severe anemia Hb < 7.", usedIn: "Same; anemia counts for correlations & pregAnemiaVsLive." },
  { name: "moderate_anemia_hb_7_to_9_9", meaning: "Moderate anemia Hb 7–9.9.", usedIn: "Same." },
  { name: "depressive_symptoms", meaning: "Depressive symptoms.", usedIn: "Same." },
  { name: "other_medical_conditions", meaning: "Other conditions captured on form.", usedIn: "Same." },
];

export const HELP_PREGNANT_MANAGED: HelpField[] = [
  { name: "hiv", meaning: "Pregnant women with HIV under management.", usedIn: "Pregnancy page; management_gap.pregnancy_gap; validateManagedVsIdentified." },
  { name: "syphilis", meaning: "Syphilis — managed.", usedIn: "Same." },
  { name: "hypothyroidism", meaning: "Hypothyroidism — managed.", usedIn: "Same." },
  { name: "hyperthyroidism", meaning: "Hyperthyroidism — managed.", usedIn: "Same." },
  { name: "hypertension", meaning: "Hypertension — managed.", usedIn: "Same." },
  { name: "hypotension", meaning: "Hypotension — managed.", usedIn: "Same." },
  { name: "diabetes_mellitus", meaning: "Diabetes mellitus — managed.", usedIn: "Same." },
  { name: "bmi_lt_18_5", meaning: "BMI < 18.5 — managed.", usedIn: "Same." },
  { name: "bmi_lt_25", meaning: "BMI flag per schema — managed.", usedIn: "Same." },
  { name: "inadequate_gestational_weight_gain", meaning: "Inadequate gestational weight gain — managed.", usedIn: "Same." },
  { name: "severe_anemia_hb_lt_7", meaning: "Severe anemia Hb < 7 — managed.", usedIn: "Same." },
  { name: "moderate_anemia_hb_7_to_9_9", meaning: "Moderate anemia Hb 7–9.9 — managed.", usedIn: "Same." },
  { name: "depressive_symptoms", meaning: "Depressive symptoms — managed.", usedIn: "Same." },
  { name: "other_medical_conditions", meaning: "Other conditions — managed.", usedIn: "Same." },
];

export const HELP_HIGH_RISK: HelpField[] = [
  { name: "multiple_pregnancy", meaning: "Multiple pregnancy flagged.", usedIn: "High-risk page; section totals & charts." },
  { name: "boh_history", meaning: "Bad obstetric history.", usedIn: "Same." },
  { name: "infections", meaning: "Infection-related high risk.", usedIn: "Same." },
  { name: "other_medical_conditions", meaning: "Other medical high-risk conditions.", usedIn: "Same." },
];

export const HELP_DELIVERY_OUTCOMES: HelpField[] = [
  { name: "corticosteroids_given_preterm", meaning: "Antenatal corticosteroids for preterm risk (count).", usedIn: "Outcomes page; section analytics." },
  { name: "registered_mothers_delivered", meaning: "Registered mothers who delivered (count).", usedIn: "Same." },
  { name: "institutional_delivery_facility", meaning: "Deliveries in reporting facility.", usedIn: "institutional_delivery_ratio numerator part." },
  { name: "institutional_delivery_other", meaning: "Institutional deliveries outside reporting facility.", usedIn: "institutional_delivery_ratio numerator part." },
  { name: "home_deliveries", meaning: "Home deliveries.", usedIn: "institutional_delivery_ratio denominator mix." },
  { name: "maternal_deaths", meaning: "Maternal deaths in window.", usedIn: "mortality_rate; alerts; anomalies(maternal_deaths); district rollup; funnel." },
  { name: "live_births", meaning: "Live births — **denominator** for mortality and several rates.", usedIn: "All mortality/LBW/preterm rates; anomalies; correlations matrix; Explorer preview." },
  { name: "vlbw_lt_1500g", meaning: "Very low birth weight < 1500 g.", usedIn: "Section analytics." },
  { name: "lbw_lt_2500g", meaning: "Low birth weight < 2500 g.", usedIn: "lbw_rate." },
  { name: "preterm_births_lt_37_weeks", meaning: "Preterm births < 37 weeks.", usedIn: "preterm_rate." },
  { name: "early_neonatal_deaths_lt_24hrs", meaning: "Early neonatal deaths < 24 h.", usedIn: "early_neonatal_mortality_rate; district rollup; funnel." },
];

export const HELP_INFANTS: HelpField[] = [
  { name: "ebf_0_6_months", meaning: "Exclusive breastfeeding 0–6 months (count).", usedIn: "Infants page." },
  { name: "lbw_vlbw_iron_0_6_months", meaning: "Iron for LBW/VLBW 0–6 months.", usedIn: "Same." },
  { name: "vitamin_d_0_6_months", meaning: "Vitamin D 0–6 months.", usedIn: "Same." },
  { name: "preterm_calcium_vitd", meaning: "Preterm calcium/vitamin D support.", usedIn: "Same." },
  { name: "ifa_6_24_months", meaning: "IFA 6–24 months.", usedIn: "Same." },
  { name: "inadequate_weight_gain_6_12_months", meaning: "Inadequate weight gain 6–12 months.", usedIn: "Same." },
  { name: "inadequate_weight_gain_12_24_months", meaning: "Inadequate weight gain 12–24 months.", usedIn: "Same." },
  { name: "adequate_weight_gain_0_24_months", meaning: "Adequate weight gain 0–24 months.", usedIn: "Same." },
  { name: "wash_counselling_parents", meaning: "WASH counselling to parents.", usedIn: "Same." },
  { name: "fully_immunized_12_23_months", meaning: "Fully immunized 12–23 months.", usedIn: "Same." },
];

export const HELP_POSTNATAL: HelpField[] = [
  { name: "newborns_screened_rbsk", meaning: "Newborns screened (RBSK).", usedIn: "Postnatal page." },
  { name: "postpartum_checkup_48h_to_14d", meaning: "Postpartum checkup 48h–14d.", usedIn: "Same." },
  { name: "hbnc_visits", meaning: "HBNC visits.", usedIn: "Same." },
  { name: "nutrition_supplements", meaning: "Nutrition supplements.", usedIn: "Same." },
  { name: "depression_screened", meaning: "Postpartum depression screened.", usedIn: "Same." },
  { name: "psychosocial_support", meaning: "Psychosocial support.", usedIn: "Same." },
  { name: "wash_counselling", meaning: "WASH counselling.", usedIn: "Same." },
  { name: "ifa_given", meaning: "IFA given (postnatal).", usedIn: "Same." },
  { name: "nutrition_counselling", meaning: "Nutrition counselling.", usedIn: "Same." },
  { name: "kmc_provided", meaning: "Kangaroo mother care provided.", usedIn: "Same." },
];

export const HELP_REMARKS: HelpField[] = [
  { name: "observational_remarks", meaning: "Free text — field observations.", usedIn: "Assessment detail; Explorer shows length flags only." },
  { name: "respondent_remarks", meaning: "Free text — respondent notes.", usedIn: "Same." },
];

export const HELP_DOCUMENTS: HelpField[] = [
  { name: "document_1 … document_6", meaning: "Optional storage keys or URLs for up to six attachments.", usedIn: "Assessment detail full paths; Explorer lists filled slot count." },
];

export const HELP_DERIVED_METRICS = [
  {
    name: "screening_rate_*",
    formula:
      "For each ANC screening column, rate = column_sum / total_anc_registered (null if denominator 0). Named: blood_grouping, cbc, hiv, syphilis, urine, tsh, ogtt, bp, hgb_4x.",
    usedIn: "Overview KPIs; Analytics suite metric cards; alerts on HIV and Hb×4.",
  },
  {
    name: "management_gap",
    formula: "Per parallel field: identified[k] − managed[k] (preconception and pregnancy keys from sections.ts).",
    usedIn: "Overview kpis.management_gap; Program overview copy.",
  },
  {
    name: "mortality_rate_maternal_per_live_birth",
    formula: "maternal_deaths / live_births (null if live_births ≤ 0).",
    usedIn: "Overview; alert if > 0.002.",
  },
  {
    name: "early_neonatal_mortality_rate_per_live_birth",
    formula: "early_neonatal_deaths_lt_24hrs / live_births.",
    usedIn: "Overview; Analytics suite.",
  },
  {
    name: "institutional_delivery_ratio",
    formula: "(institutional_delivery_facility + institutional_delivery_other) / (those + home_deliveries).",
    usedIn: "Overview; Analytics suite.",
  },
  {
    name: "lbw_rate",
    formula: "lbw_lt_2500g / live_births.",
    usedIn: "Overview; Analytics suite.",
  },
  {
    name: "preterm_rate",
    formula: "preterm_births_lt_37_weeks / live_births.",
    usedIn: "Overview; Analytics suite.",
  },
  {
    name: "anemia_vs_bmi (correlations)",
    formula:
      "Preconception: per assessment, anemia = severe + moderate anemia columns; BMI band = sum of three BMI fields. Pregnancy: anemia = severe + moderate; BMI band = bmi_lt_18_5 + bmi_lt_25. Pearson r between series across assessments.",
    usedIn: "Correlations page; Analytics heatmap matrix includes anemia_pre, bmi_pre, anemia_preg, bmi_preg, live_births.",
  },
  {
    name: "districtRollup",
    formula:
      "Groups by facility.district; sums assessments, live_births, maternal_deaths, early_neonatal_deaths, anc_registered_total, hiv_tested_total, hemoglobin_4x_total.",
    usedIn: "Analytics suite district bar chart (HIV and Hb rates vs ANC).",
  },
  {
    name: "clinicalCrossSection",
    formula:
      "Pairs per assessment: ANC vs Hb×4, ANC vs HIV tested; pregnancy anemia sum vs live_births; preconception anemia identified vs managed sums.",
    usedIn: "Analytics suite scatter charts.",
  },
  {
    name: "anomalies",
    formula: "Z-score vs cohort mean for live_births or maternal_deaths; flag |z| > 2.5.",
    usedIn: "Program overview anomaly query; points linked to assessmentId and facility name.",
  },
  {
    name: "pipelineFunnels",
    formula:
      "Four standardized stage chains (preconception, pregnancy, postnatal, infant) with per-stage counts, conversion from first stage, drop vs prior, and bottleneck index (largest relative drop).",
    usedIn: "GET /analytics/intelligence; Analytics suite public health charts.",
  },
  {
    name: "gapTriple / district severity",
    formula:
      "Screening gap: max(0, eligible − observed) with documented numerators; pregnancy treatment gap from identified vs managed sums; district rows combine screening gap rate, treatment gap rate, and LBW rate into a severity score for ranking.",
    usedIn: "Intelligence payload gaps.*; district heatmap table in Analytics suite.",
  },
  {
    name: "correlation_engine (extended)",
    formula:
      "Pearson and Spearman on assessment-level series; larger correlation matrix; χ² and risk ratio for binary anemia×preterm; linear regression points for scatter panels.",
    usedIn: "GET /analytics/intelligence.",
  },
  {
    name: "time_series intelligence",
    formula:
      "Monthly aligned buckets for HIV screening %, LBW rate, MA(3), trend split, seasonal index, z-spike indices on monthly values.",
    usedIn: "Intelligence payload; ComposedChart in Analytics suite.",
  },
  {
    name: "anomaly bundle",
    formula: "Z-score (HIV tests, live births), IQR on HIV tests, isolation-style scores on HIV tests — all assessment-indexed.",
    usedIn: "GET /analytics/intelligence anomalies.*.",
  },
];

export const HELP_VALIDATION = [
  {
    code: "SCREENING_EXCEEDS_REGISTERED",
    rule: "Each screening count must be ≤ total_anc_registered (except the total field itself).",
    usedIn: "Overview validation list; assessment detail validationIssues.",
  },
  {
    code: "MANAGED_EXCEEDS_IDENTIFIED",
    rule: "For matching keys, managed count must not exceed identified count (preconception & pregnancy).",
    usedIn: "Same surfaces.",
  },
];

export const HELP_API_ROUTES = [
  { route: "GET …/analytics/overview", role: "KPIs, funnel, alerts, validation issues (cached ~30s)." },
  { route: "GET …/analytics/section/:section", role: "Totals, fieldMetrics, comparativeDistribution, monthly timeSeries per canonical section key." },
  { route: "GET …/analytics/intelligence", role: "Public health intelligence: pipelines, gaps, correlations, cohorts, time series, distributions, multivariate, KPI deltas, anomalies (z/IQR/isolation), cross-entity links, deterministic what/why/next insights (cached ~60s)." },
  { route: "GET …/analytics/decision-support", role: "Decision layer: top 5 actions, program health score 0–100, alert center, illustrative what-if, data quality, benchmarking (half-window + districts), story-mode steps (cached ~45s)." },
  { route: "GET …/analytics/correlations", role: "anemia_vs_bmi + correlation matrix." },
  { route: "GET …/analytics/comparison-lab/catalog", role: "Comparison Lab: metric registry + precomputed compatibility matrix (no DB)." },
  { route: "GET …/analytics/comparison-lab/run?metricA=&metricB=&metricC=", role: "Comparison Lab: filtered assessment rows, stats (Pearson, ANOVA, χ²), auto chart payload; cached ~30s." },
  { route: "GET …/analytics/district-rollup", role: "District aggregates for charts." },
  { route: "GET …/analytics/clinical-cross-section", role: "Scatter source pairs." },
  { route: "GET …/analytics/anomalies?metric=", role: "Z-score flags for live_births or maternal_deaths." },
  { route: "GET …/analytics/explorer", role: "Lightweight listing + document/remarks meta." },
  { route: "GET …/analytics/assessments/:id", role: "Full numeric sections + remarks + documents + validation." },
  { route: "GET …/facilities", role: "List facilities (id, name, district, state) for filters and UI." },
  { route: "GET …/facilities/districts", role: "Distinct district strings for filter dropdown." },
  { route: "POST …/ingestion/assessments", role: "Create or update assessment rows (programmatic ingest)." },
  { route: "GET …/metrics/health", role: "Liveness probe." },
  { route: "GET …/metrics/counts", role: "Row counts snapshot for ops dashboards." },
  { route: "GET …/config", role: "Public config: AI flags, LM Studio hints, API base string for clients." },
  { route: "GET …/ai/status", role: "Whether server-side AI client is enabled (env-gated)." },
  { route: "GET …/ai/models", role: "Proxies LM Studio OpenAI-compatible GET /v1/models when LM_STUDIO_BASE_URL is set." },
  { route: "POST …/ai/insights", role: "LLM narrative from an arbitrary JSON snapshot (typically overview); counts must come from client payload." },
  { route: "POST …/ai/intelligence-insights", role: "Returns deterministic insights block from payload plus optional LLM text grounded in public health intelligence JSON." },
];

/** Keys accepted by `GET /analytics/section/:section` (must match analytics.service pickers). */
export const HELP_SECTION_ENDPOINT_KEYS = [
  "preconception_women_identified",
  "preconception_interventions",
  "preconception_women_managed",
  "pregnant_women_registered_and_screened",
  "pregnant_women_identified",
  "pregnant_women_managed",
  "high_risk_pregnancy",
  "delivery_and_outcomes",
  "infants_0_to_24_months",
  "postnatal_women",
] as const;

export const HELP_PAGE_MAP = [
  { page: "Program overview", path: "/overview", data: "overview KPIs, alerts, validation count, anomalies." },
  { page: "Analytics suite", path: "/analytics", data: "Public health intelligence (pipelines, gaps, charts), overview-derived metrics, district chart, funnel bars, matrix, scatters." },
  { page: "Preconception", path: "/preconception", data: "Sections: preconception_women_identified, _managed, preconception_interventions." },
  { page: "Pregnancy", path: "/pregnancy", data: "registered_and_screened, identified, managed." },
  { page: "Postnatal", path: "/postnatal", data: "postnatal_women." },
  { page: "Infants", path: "/infants", data: "infants_0_to_24_months." },
  { page: "Outcomes", path: "/outcomes", data: "delivery_and_outcomes." },
  { page: "High-risk", path: "/high-risk", data: "high_risk_pregnancy." },
  { page: "Correlations", path: "/correlations", data: "correlations endpoint." },
  { page: "Explorer", path: "/explorer", data: "explorer listing; drill to /explorer/[id] for assessment detail." },
  { page: "AI Insights", path: "/ai", data: "Sends **overview** and/or **intelligence** JSON to LLM when enabled — counts remain API-sourced; deterministic blocks always available from /analytics/intelligence." },
  { page: "Settings", path: "/settings", data: "Public config only (not row data)." },
];
