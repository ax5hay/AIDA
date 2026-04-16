/**
 * Per-assessment engineered series for Pearson/Spearman correlation — single source of truth
 * for `/analytics/correlations` and public-health intelligence. Field names align with Prisma schema.
 */
import { correlationCoefficient } from "./derived";
import { spearmanCorrelation } from "./intelligence";

/** Subset of preconceptionWomenIdentified used for anemia × BMI correlation tracks */
export type PreconceptionIdentifiedAnemiaBmiSlice = {
  severe_anemia_hb_lt_8: number;
  moderate_anemia_hb_8_to_11_99: number;
  bmi_lt_16: number;
  bmi_16_to_18_49: number;
  bmi_18_5_to_lt_21: number;
} | null;

/** Subset of pregnantWomenIdentified for pregnancy anemia × BMI tracks */
export type PregnantIdentifiedAnemiaBmiSlice = {
  severe_anemia_hb_lt_7: number;
  moderate_anemia_hb_7_to_9_9: number;
  bmi_lt_18_5: number;
  bmi_lt_25: number;
} | null;

export function sumPreconceptionAnemiaIdentified(p: PreconceptionIdentifiedAnemiaBmiSlice): number {
  if (!p) return 0;
  return p.severe_anemia_hb_lt_8 + p.moderate_anemia_hb_8_to_11_99;
}

export function sumPreconceptionBmiBands(p: PreconceptionIdentifiedAnemiaBmiSlice): number {
  if (!p) return 0;
  return p.bmi_lt_16 + p.bmi_16_to_18_49 + p.bmi_18_5_to_lt_21;
}

export function sumPregnancyAnemiaIdentified(p: PregnantIdentifiedAnemiaBmiSlice | null): number {
  if (!p) return 0;
  return p.severe_anemia_hb_lt_7 + p.moderate_anemia_hb_7_to_9_9;
}

export function sumPregnancyBmiBands(p: PregnantIdentifiedAnemiaBmiSlice | null): number {
  if (!p) return 0;
  return p.bmi_lt_18_5 + p.bmi_lt_25;
}

/** Institutional delivery counts (facility + other) — same construction as institutionalDeliveryRatio inputs */
export function institutionalDeliveryCount(d: {
  institutional_delivery_facility: number;
  institutional_delivery_other: number;
} | null | undefined): number {
  if (!d) return 0;
  return d.institutional_delivery_facility + d.institutional_delivery_other;
}

/** Row shape for GET /analytics/correlations (compact select) */
export type CompactCorrelationRow = {
  id: string;
  periodStart: Date;
  preconceptionWomenIdentified: PreconceptionIdentifiedAnemiaBmiSlice;
  pregnantWomenIdentified: PregnantIdentifiedAnemiaBmiSlice;
  deliveryAndOutcomes: { live_births: number | null } | null;
};

export type CompactCorrelationSeries = {
  anemiaPre: number[];
  bmiPre: number[];
  anemiaPreg: number[];
  bmiPreg: number[];
  liveBirths: number[];
};

export function buildCompactCorrelationSeries(rows: CompactCorrelationRow[]): CompactCorrelationSeries {
  return {
    anemiaPre: rows.map((r) => sumPreconceptionAnemiaIdentified(r.preconceptionWomenIdentified)),
    bmiPre: rows.map((r) => sumPreconceptionBmiBands(r.preconceptionWomenIdentified)),
    anemiaPreg: rows.map((r) => sumPregnancyAnemiaIdentified(r.pregnantWomenIdentified)),
    bmiPreg: rows.map((r) => sumPregnancyBmiBands(r.pregnantWomenIdentified)),
    liveBirths: rows.map((r) => r.deliveryAndOutcomes?.live_births ?? 0),
  };
}

/**
 * Minimal row shape for intelligence correlations (maps 1:1 from full assessment selects).
 * Pregnancy identified includes comorbidity counts used in preset pairs.
 */
export type IntelligenceCorrelationRow = {
  preconceptionWomenIdentified: PreconceptionIdentifiedAnemiaBmiSlice;
  pregnantWomenIdentified: {
    severe_anemia_hb_lt_7: number;
    moderate_anemia_hb_7_to_9_9: number;
    bmi_lt_18_5: number;
    bmi_lt_25: number;
    diabetes_mellitus: number;
    hypertension: number;
  } | null;
  pregnantWomenRegisteredAndScreened: { total_anc_registered: number } | null;
  deliveryAndOutcomes: {
    live_births: number;
    preterm_births_lt_37_weeks: number;
    lbw_lt_2500g: number;
    maternal_deaths: number;
    institutional_delivery_facility: number;
    institutional_delivery_other: number;
  } | null;
  infants0To24Months: {
    ebf_0_6_months: number;
    adequate_weight_gain_0_24_months: number;
  } | null;
};

/**
 * Full per-assessment series for intelligence extended matrix + presets (same row order as input).
 */
export function buildIntelligencePerAssessmentSeries(rows: IntelligenceCorrelationRow[]): {
  anemiaPre: number[];
  bmiPre: number[];
  anemiaPreg: number[];
  bmiPreg: number[];
  preterm: number[];
  lbw: number[];
  live: number[];
  ancReg: number[];
  institutional: number[];
  diabetes: number[];
  hypertension: number[];
  matDeaths: number[];
  ebf: number[];
  wtOk: number[];
} {
  return {
    anemiaPre: rows.map((r) => sumPreconceptionAnemiaIdentified(r.preconceptionWomenIdentified)),
    bmiPre: rows.map((r) => sumPreconceptionBmiBands(r.preconceptionWomenIdentified)),
    anemiaPreg: rows.map((r) => sumPregnancyAnemiaIdentified(r.pregnantWomenIdentified)),
    bmiPreg: rows.map((r) => sumPregnancyBmiBands(r.pregnantWomenIdentified)),
    preterm: rows.map((r) => r.deliveryAndOutcomes?.preterm_births_lt_37_weeks ?? 0),
    lbw: rows.map((r) => r.deliveryAndOutcomes?.lbw_lt_2500g ?? 0),
    live: rows.map((r) => r.deliveryAndOutcomes?.live_births ?? 0),
    ancReg: rows.map((r) => r.pregnantWomenRegisteredAndScreened?.total_anc_registered ?? 0),
    institutional: rows.map((r) => institutionalDeliveryCount(r.deliveryAndOutcomes)),
    diabetes: rows.map((r) => r.pregnantWomenIdentified?.diabetes_mellitus ?? 0),
    hypertension: rows.map((r) => r.pregnantWomenIdentified?.hypertension ?? 0),
    matDeaths: rows.map((r) => r.deliveryAndOutcomes?.maternal_deaths ?? 0),
    ebf: rows.map((r) => r.infants0To24Months?.ebf_0_6_months ?? 0),
    wtOk: rows.map((r) => r.infants0To24Months?.adequate_weight_gain_0_24_months ?? 0),
  };
}

export type CorrelationPresetEntry = {
  label: string;
  pearson: number | null;
  spearman: number | null;
};

/**
 * Named hypothesis pairs for intelligence (clinical/programme narratives). Each pair is chosen to be
 * interpretable on the same assessment row (facility × period).
 */
export function buildIntelligenceCorrelationPresets(s: ReturnType<typeof buildIntelligencePerAssessmentSeries>): Record<
  string,
  CorrelationPresetEntry
> {
  return {
    anemia_preterm: {
      pearson: correlationCoefficient(s.anemiaPreg, s.preterm),
      spearman: spearmanCorrelation(s.anemiaPreg, s.preterm),
      label: "Pregnancy anemia counts vs preterm births (same window)",
    },
    anemia_lbw: {
      pearson: correlationCoefficient(s.anemiaPreg, s.lbw),
      spearman: spearmanCorrelation(s.anemiaPreg, s.lbw),
      label: "Pregnancy anemia vs LBW counts",
    },
    bmi_birthweight: {
      pearson: correlationCoefficient(s.bmiPreg, s.lbw),
      spearman: spearmanCorrelation(s.bmiPreg, s.lbw),
      label: "BMI risk bands vs LBW counts",
    },
    anc_institutional: {
      pearson: correlationCoefficient(s.ancReg, s.institutional),
      spearman: spearmanCorrelation(s.ancReg, s.institutional),
      label: "ANC registered vs institutional delivery counts",
    },
    diabetes_complications: {
      pearson: correlationCoefficient(s.diabetes, s.preterm),
      spearman: spearmanCorrelation(s.diabetes, s.preterm),
      label: "Diabetes (identified) vs preterm births",
    },
    hypertension_mortality: {
      pearson: correlationCoefficient(s.hypertension, s.matDeaths),
      spearman: spearmanCorrelation(s.hypertension, s.matDeaths),
      label: "Hypertension (identified) vs maternal deaths",
    },
    breastfeeding_growth: {
      pearson: correlationCoefficient(s.ebf, s.wtOk),
      spearman: spearmanCorrelation(s.ebf, s.wtOk),
      label: "EBF vs adequate weight gain (0–24m)",
    },
  };
}

/** Stats for before/after intervention comparison cards (anemia × BMI only, both life-course tracks). */
export function computeAnemiaBmiWindowStats(rows: CompactCorrelationRow[]): {
  pre_r: number | null;
  preg_r: number | null;
  live_sum: number;
  n: number;
} {
  const c = buildCompactCorrelationSeries(rows);
  return {
    pre_r: correlationCoefficient(c.anemiaPre, c.bmiPre),
    preg_r: correlationCoefficient(c.anemiaPreg, c.bmiPreg),
    live_sum: c.liveBirths.reduce((a, b) => a + b, 0),
    n: rows.length,
  };
}
