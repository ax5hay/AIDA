import {
  buildAlertCenter,
  computeProgramHealthScore,
  storySteps,
  topFiveActions,
  whatIfScenarios,
} from "@aida/analytics-engine";
import { buildPublicHealthIntelligence } from "./intelligence-aggregator";
import type { ExplorerFilters } from "./analytics-filters";
import type { ChcAssessmentIntelligenceRow } from "./assessment-selects";

export type IntelligencePayload = ReturnType<typeof buildPublicHealthIntelligence>;

/** % of rows missing ANC registered or delivery section */
export function missingCoreSectionsPct(rows: ChcAssessmentIntelligenceRow[]): number {
  if (rows.length === 0) return 0;
  let n = 0;
  for (const r of rows) {
    if (!r.pregnantWomenRegisteredAndScreened || !r.deliveryAndOutcomes) n++;
  }
  return n / rows.length;
}

export function buildDecisionSupportBundle(
  rows: ChcAssessmentIntelligenceRow[],
  intel: IntelligencePayload,
  validationIssueCount: number,
  f: ExplorerFilters,
) {
  const kpis = intel.kpis;
  const gaps = intel.gaps;
  const screeningGap = gaps.screening as { gapRate: number | null };
  const treatmentGap = gaps.treatment_pregnancy as { gapRate: number | null };

  const pipelines = intel.pipelines;
  let bottleneck: { pipeline: string; label: string } | null = null;
  for (const p of pipelines) {
    if (p.bottleneckIndex !== null && p.stages[p.bottleneckIndex]) {
      bottleneck = { pipeline: p.label, label: p.stages[p.bottleneckIndex]!.label };
      break;
    }
  }

  const districtRows = (gaps.district_heatmap ?? []) as Array<{ district: string; severity_score: number }>;
  const worst_district = districtRows[0]?.district ?? null;

  const presets = intel.correlation_engine.presets as Record<string, { pearson: number | null; label: string }>;
  const strong_correlations = Object.values(presets).slice(0, 5);

  const chiP =
    intel.correlation_engine.chi_square?.anemia_exposed_vs_preterm?.pApprox ?? null;

  const zHiv = intel.anomalies.z_score.hiv_tested;
  const zLive = intel.anomalies.z_score.live_births;
  const iqrN = intel.anomalies.iqr.hiv_tested.length;
  const isoN = intel.anomalies.isolation_forest.hiv_tested.length;

  const ts = intel.time_series;
  const trend_hiv = ts.trend?.hiv_screening ?? "stable";
  const trend_lbw = ts.trend?.lbw ?? "stable";

  const anomalyCount = zHiv.length + zLive.length + iqrN + isoN;

  const health = computeProgramHealthScore({
    screening_rate_hiv: kpis.screening_coverage_hiv ?? null,
    screening_rate_hgb_4x: kpis.screening_coverage_hgb_4x ?? null,
    screening_rate_bp: kpis.screening_coverage_bp ?? null,
    maternal_mortality_rate: kpis.mortality_rate_maternal_per_live_birth ?? null,
    early_neonatal_mortality_rate: kpis.early_neonatal_mortality_rate ?? null,
    lbw_rate: kpis.lbw_rate ?? null,
    preterm_rate: kpis.preterm_rate ?? null,
    screening_gap_rate: screeningGap.gapRate,
    treatment_gap_rate: treatmentGap.gapRate,
  });

  const actions = topFiveActions({
    screening_gap_rate: screeningGap.gapRate,
    treatment_gap_rate: treatmentGap.gapRate,
    bottleneck,
    worst_district,
    strong_correlations,
    anomaly_count: anomalyCount,
    trend_hiv,
    trend_lbw,
    chi_anemia_preterm_p: chiP,
  });

  const alerts = buildAlertCenter({
    maternal_mortality_rate: kpis.mortality_rate_maternal_per_live_birth ?? null,
    screening_rate_hiv: kpis.screening_coverage_hiv ?? null,
    screening_rate_hgb_4x: kpis.screening_coverage_hgb_4x ?? null,
    trend_hiv,
    trend_lbw,
    district_hotspots: districtRows,
    z_live: zLive.length,
    z_hiv: zHiv.length,
    validation_issue_count: validationIssueCount,
  });

  const what_if = whatIfScenarios({
    hiv_screening_rate: kpis.screening_coverage_hiv ?? null,
    lbw_rate: kpis.lbw_rate ?? null,
    maternal_mortality_rate: kpis.mortality_rate_maternal_per_live_birth ?? null,
  });

  const missing_pct = missingCoreSectionsPct(rows);
  const suspicious = anomalyCount + Math.min(validationIssueCount, 50);

  const deltas = kpis.deltas_half_window;

  const benchmarking = {
    current_vs_previous_half: {
      hiv_screening_delta_pp: deltas?.hiv_screening_pp ?? null,
      lbw_rate_delta_pp: deltas?.lbw_rate_pp ?? null,
      narrative:
        deltas?.hiv_screening_pp !== null && deltas?.hiv_screening_pp !== undefined
          ? `HIV coverage moved ${(deltas.hiv_screening_pp * 100).toFixed(2)} percentage points (second vs first half of months in filter).`
          : "Insufficient monthly points for half-window comparison.",
    },
    region_vs_region: {
      worst: districtRows.slice(0, 3),
      best: [...districtRows].sort((a, b) => a.severity_score - b.severity_score).slice(0, 3),
    },
  };

  const story = storySteps({
    assessmentCount: intel.meta.assessmentCount,
    healthScore: health.score,
    hiv: kpis.screening_coverage_hiv ?? null,
    topAction: actions[0]?.title ?? "Review coverage and gap panels.",
  });

  return {
    meta: {
      filters: f,
      computedAt: new Date().toISOString(),
      refresh_hint_sec: 60,
    },
    program_health_score: health,
    top_actions: actions,
    alert_center: alerts,
    what_if,
    data_quality: {
      missing_core_sections_pct: missing_pct,
      validation_issue_count: validationIssueCount,
      suspicious_assessment_flags: suspicious,
      inconsistent_rows_hint:
        validationIssueCount > 0
          ? `${validationIssueCount} validation rule hits (screening vs registered, managed vs identified).`
          : "No register consistency issues in filtered rows.",
    },
    benchmarking,
    story_mode: story,
    what_if_disclaimer:
      "Projections apply simple elasticity to current KPIs; use for prioritization dialogue, not forecasting caseloads.",
  };
}
