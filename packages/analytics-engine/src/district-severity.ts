/**
 * Composite district stress score for gap-equity views — explicit weighted sum of normalized gap/rate signals.
 * Weights sum to 1; screening and treatment gaps dominate; LBW rate anchors outcome burden.
 */
export const DISTRICT_SEVERITY_WEIGHTS = {
  /** Share of ANC-eligible screening gap (HIV example in pipeline) */
  screening_gap: 0.4,
  /** Identified − managed pregnancy gap rate */
  treatment_gap: 0.35,
  /** Outcome: LBW share of live births */
  lbw_rate: 0.25,
} as const;

export type DistrictGapRatesInput = {
  screening_gap_rate: number | null;
  treatment_gap_rate: number | null;
  lbw_rate: number | null;
};

/**
 * Returns a scalar in roughly [0, ~1] when inputs are proportions in [0,1]. Not calibrated to epidemiology — ranking only.
 */
export function computeDistrictSeverityScore(d: DistrictGapRatesInput): number {
  const s = d.screening_gap_rate ?? 0;
  const t = d.treatment_gap_rate ?? 0;
  const l = d.lbw_rate ?? 0;
  return (
    s * DISTRICT_SEVERITY_WEIGHTS.screening_gap +
    t * DISTRICT_SEVERITY_WEIGHTS.treatment_gap +
    l * DISTRICT_SEVERITY_WEIGHTS.lbw_rate
  );
}
