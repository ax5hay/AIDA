/**
 * Derived metrics — computed only from canonical schema fields.
 */
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

export function screeningRates(registered: {
  total_anc_registered: number;
  blood_grouping: number;
  cbc_tested: number;
  hiv_tested: number;
  syphilis_tested: number;
  urine_routine_microscopy: number;
  thyroid_tsh_tested: number;
  gdm_ogtt_tested: number;
  blood_pressure_checked: number;
  hemoglobin_tested_4_times: number;
}): ScreeningRates {
  const d = registered.total_anc_registered;
  const rate = (n: number) => (d > 0 ? n / d : null);
  return {
    screening_rate_blood_grouping: rate(registered.blood_grouping),
    screening_rate_cbc: rate(registered.cbc_tested),
    screening_rate_hiv: rate(registered.hiv_tested),
    screening_rate_syphilis: rate(registered.syphilis_tested),
    screening_rate_urine: rate(registered.urine_routine_microscopy),
    screening_rate_tsh: rate(registered.thyroid_tsh_tested),
    screening_rate_ogtt: rate(registered.gdm_ogtt_tested),
    screening_rate_bp: rate(registered.blood_pressure_checked),
    screening_rate_hgb_4x: rate(registered.hemoglobin_tested_4_times),
  };
}

export type ManagementGaps = {
  preconception_gap: Record<string, number>;
  pregnancy_gap: Record<string, number>;
};

export function managementGaps(
  preId: Record<string, number>,
  preManaged: Record<string, number>,
  pregId: Record<string, number>,
  pregManaged: Record<string, number>,
  preKeys: readonly string[],
  pregKeys: readonly string[],
): ManagementGaps {
  const preconception_gap: Record<string, number> = {};
  for (const k of preKeys) {
    preconception_gap[k] = (preId[k] ?? 0) - (preManaged[k] ?? 0);
  }
  const pregnancy_gap: Record<string, number> = {};
  for (const k of pregKeys) {
    pregnancy_gap[k] = (pregId[k] ?? 0) - (pregManaged[k] ?? 0);
  }
  return { preconception_gap, pregnancy_gap };
}

export function mortalityRate(maternal_deaths: number, live_births: number): number | null {
  if (live_births <= 0) return null;
  return maternal_deaths / live_births;
}

export function earlyNeonatalMortalityRate(
  early_neonatal_deaths_lt_24hrs: number,
  live_births: number,
): number | null {
  if (live_births <= 0) return null;
  return early_neonatal_deaths_lt_24hrs / live_births;
}

export function institutionalDeliveryRatio(
  institutional_delivery_facility: number,
  institutional_delivery_other: number,
  home_deliveries: number,
): number | null {
  const total = institutional_delivery_facility + institutional_delivery_other + home_deliveries;
  if (total <= 0) return null;
  return (institutional_delivery_facility + institutional_delivery_other) / total;
}

export function lbwRate(lbw_lt_2500g: number, live_births: number): number | null {
  if (live_births <= 0) return null;
  return lbw_lt_2500g / live_births;
}

export function pretermRate(preterm_births_lt_37_weeks: number, live_births: number): number | null {
  if (live_births <= 0) return null;
  return preterm_births_lt_37_weeks / live_births;
}

/** Pearson r between two equal-length series */
export function correlationCoefficient(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / n;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const ca = a[i] - ma;
    const cb = b[i] - mb;
    num += ca * cb;
    da += ca * ca;
    db += cb * cb;
  }
  const den = Math.sqrt(da * db);
  if (den === 0) return null;
  return num / den;
}
