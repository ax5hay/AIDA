import {
  DELIVERY_AND_OUTCOMES_FIELDS,
  HIGH_RISK_PREGNANCY_FIELDS,
  INFANTS_0_TO_24_MONTHS_FIELDS,
  POSTNATAL_WOMEN_FIELDS,
  PREGNANT_WOMEN_IDENTIFIED_FIELDS,
  PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS,
  PRECONCEPTION_INTERVENTIONS_FIELDS,
  PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
  chiSquare2x2,
  classifyTrend,
  buildIntelligenceCorrelationPresets,
  buildIntelligencePerAssessmentSeries,
  computeDistrictSeverityScore,
  deterministicIntelligenceInsights,
  distributionShares,
  earlyNeonatalMortalityRate,
  gapTriple,
  institutionalDeliveryRatio,
  lbwRate,
  linearRegression,
  managementGaps,
  mortalityRate,
  movingAverage,
  pretermRate,
  riskRatio2x2,
  screeningRates,
  seasonalIndicesByMonth,
  sumFields,
  zScoreSpikeIndices,
  buildAllPipelines,
  type SectionTotals,
} from "@aida/analytics-engine";
import {
  correlationMatrix,
  detectAnomalies,
  detectIqrOutliers,
  isolationForestScores1D,
  topIsolationAnomalyIndices,
} from "@aida/ml-engine";

import type { IntelligenceCorrelationRow } from "@aida/analytics-engine";
import type { ExplorerFilters } from "./analytics-filters";
import type { FacilityAssessmentIntelligenceRow } from "./assessment-selects";

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sumSchemaFields(obj: object, keys: readonly string[]): number {
  const o = obj as Record<string, unknown>;
  let s = 0;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && !Number.isNaN(v)) s += v;
  }
  return s;
}

function aggregateRowsByMonth(rows: FacilityAssessmentIntelligenceRow[]): Array<{
  month: string;
  periodStart: string;
  rows: FacilityAssessmentIntelligenceRow[];
}> {
  const map = new Map<string, FacilityAssessmentIntelligenceRow[]>();
  for (const r of rows) {
    const k = monthKey(r.periodStart);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, rs]) => {
      const [y, mo] = month.split("-").map((x) => Number(x));
      const ps = new Date(Date.UTC(y, mo - 1, 1)).toISOString();
      return { month, periodStart: ps, rows: rs };
    });
}

export function buildPublicHealthIntelligence(
  rows: FacilityAssessmentIntelligenceRow[],
  f: ExplorerFilters,
) {
  const preIdRows = rows.map((r) => r.preconceptionWomenIdentified).filter(Boolean) as object[];
  const preIntRows = rows.map((r) => r.preconceptionInterventions).filter(Boolean) as object[];
  const preManRows = rows.map((r) => r.preconceptionWomenManaged).filter(Boolean) as object[];
  const regRows = rows.map((r) => r.pregnantWomenRegisteredAndScreened).filter(Boolean) as object[];
  const pregIdRows = rows.map((r) => r.pregnantWomenIdentified).filter(Boolean) as object[];
  const pregManRows = rows.map((r) => r.pregnantWomenManaged).filter(Boolean) as object[];
  const delRows = rows.map((r) => r.deliveryAndOutcomes).filter(Boolean) as object[];
  const postRows = rows.map((r) => r.postnatalWomen).filter(Boolean) as object[];
  const infRows = rows.map((r) => r.infants0To24Months).filter(Boolean) as object[];

  const preIdTot = sumFields(preIdRows as Parameters<typeof sumFields>[0], PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const preIntTot = sumFields(preIntRows as Parameters<typeof sumFields>[0], PRECONCEPTION_INTERVENTIONS_FIELDS as unknown as string[]);
  const preManTot = sumFields(preManRows as Parameters<typeof sumFields>[0], PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const regTot = sumFields(regRows as Parameters<typeof sumFields>[0], PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS as unknown as string[]);
  const pregIdTot = sumFields(pregIdRows as Parameters<typeof sumFields>[0], PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const pregManTot = sumFields(pregManRows as Parameters<typeof sumFields>[0], PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const delTot = sumFields(delRows as Parameters<typeof sumFields>[0], DELIVERY_AND_OUTCOMES_FIELDS as unknown as string[]);
  const postTot = sumFields(postRows as Parameters<typeof sumFields>[0], POSTNATAL_WOMEN_FIELDS as unknown as string[]);
  const infTot = sumFields(infRows as Parameters<typeof sumFields>[0], INFANTS_0_TO_24_MONTHS_FIELDS as unknown as string[]);
  const hrRows = rows
    .map((r) => r.highRiskPregnancy)
    .filter((x): x is NonNullable<typeof x> => x != null)
    .map((row) => {
      const o: Record<string, number> = {};
      for (const k of HIGH_RISK_PREGNANCY_FIELDS) {
        const v = (row as Record<string, unknown>)[k];
        if (typeof v === "number" && !Number.isNaN(v)) o[k] = v;
      }
      return o;
    });
  const hrTot = sumFields(hrRows, HIGH_RISK_PREGNANCY_FIELDS as unknown as string[]);

  const sectionTotals: SectionTotals = {
    preconceptionIdentified: preIdTot as Record<string, number>,
    preconceptionInterventions: preIntTot as Record<string, number>,
    preconceptionManaged: preManTot as Record<string, number>,
    pregnantRegisteredScreened: regTot as Record<string, number>,
    pregnantIdentified: pregIdTot as Record<string, number>,
    pregnantManaged: pregManTot as Record<string, number>,
    deliveryOutcomes: delTot as Record<string, number>,
    postnatalWomen: postTot as Record<string, number>,
    infants: infTot as Record<string, number>,
  };

  const pipelines = buildAllPipelines(sectionTotals);

  const eligibleAnc = regTot.total_anc_registered;
  const screenedHiv = regTot.hiv_tested;
  const screenedGap = gapTriple(eligibleAnc, screenedHiv);

  const pregIdentSum = PREGNANT_WOMEN_IDENTIFIED_FIELDS.reduce((s, k) => s + ((pregIdTot as Record<string, number>)[k] ?? 0), 0);
  const pregManSum = PREGNANT_WOMEN_IDENTIFIED_FIELDS.reduce((s, k) => s + ((pregManTot as Record<string, number>)[k] ?? 0), 0);
  const treatmentGap = gapTriple(pregIdentSum, pregManSum);

  const managedApprox = delTot.registered_mothers_delivered;
  const successfulOutcomeApprox =
    (delTot.institutional_delivery_facility ?? 0) +
    (delTot.institutional_delivery_other ?? 0) +
    (infTot.adequate_weight_gain_0_24_months ?? 0);
  const outcomeGap = gapTriple(managedApprox, successfulOutcomeApprox);

  const sr = screeningRates(regTot as Parameters<typeof screeningRates>[0]);
  const matR = mortalityRate(delTot.maternal_deaths, delTot.live_births);
  const lbwR = lbwRate(delTot.lbw_lt_2500g, delTot.live_births);
  const instR = institutionalDeliveryRatio(
    delTot.institutional_delivery_facility,
    delTot.institutional_delivery_other,
    delTot.home_deliveries,
  );

  const mg = managementGaps(
    preIdTot as Record<string, number>,
    preManTot as Record<string, number>,
    pregIdTot as Record<string, number>,
    pregManTot as Record<string, number>,
    PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[],
    PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[],
  );

  /** District-level gaps + severity score for heatmap tables */
  type DistAgg = {
    district: string;
    state: string;
    assessments: number;
    anc: number;
    hiv: number;
    hgb4: number;
    pregId: number;
    pregMan: number;
    live: number;
    lbw: number;
    matDeaths: number;
  };
  const dmap = new Map<string, DistAgg>();
  for (const r of rows) {
    const d = r.facility.district;
    const cur =
      dmap.get(d) ??
      {
        district: d,
        state: r.facility.state ?? "",
        assessments: 0,
        anc: 0,
        hiv: 0,
        hgb4: 0,
        pregId: 0,
        pregMan: 0,
        live: 0,
        lbw: 0,
        matDeaths: 0,
      };
    cur.state = r.facility.state ?? cur.state;
    cur.assessments += 1;
    const reg = r.pregnantWomenRegisteredAndScreened;
    cur.anc += reg?.total_anc_registered ?? 0;
    cur.hiv += reg?.hiv_tested ?? 0;
    cur.hgb4 += reg?.hemoglobin_tested_4_times ?? 0;
    const pi = r.pregnantWomenIdentified;
    const pm = r.pregnantWomenManaged;
    if (pi) {
      cur.pregId += sumSchemaFields(pi, PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
    }
    if (pm) {
      cur.pregMan += sumSchemaFields(pm, PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
    }
    const del = r.deliveryAndOutcomes;
    cur.live += del?.live_births ?? 0;
    cur.lbw += del?.lbw_lt_2500g ?? 0;
    cur.matDeaths += del?.maternal_deaths ?? 0;
    dmap.set(d, cur);
  }

  const districtGapRows = [...dmap.values()].map((x) => {
    const screeningGapRate = x.anc > 0 ? Math.max(0, x.anc - x.hiv) / x.anc : null;
    const treatmentG = Math.max(0, x.pregId - x.pregMan);
    const treatmentGapRate = x.pregId > 0 ? treatmentG / x.pregId : null;
    const lbwRateD = x.live > 0 ? x.lbw / x.live : null;
    const severity_score = computeDistrictSeverityScore({
      screening_gap_rate: screeningGapRate,
      treatment_gap_rate: treatmentGapRate,
      lbw_rate: lbwRateD,
    });
    return {
      district: x.district,
      state: x.state,
      assessments: x.assessments,
      screening_gap_rate: screeningGapRate,
      treatment_gap_count: treatmentG,
      treatment_gap_rate: treatmentGapRate,
      lbw_rate: lbwRateD,
      severity_score,
    };
  });
  districtGapRows.sort((a, b) => b.severity_score - a.severity_score);

  const corrRows = rows.map(
    (r) =>
      ({
        preconceptionWomenIdentified: r.preconceptionWomenIdentified,
        pregnantWomenIdentified: r.pregnantWomenIdentified,
        pregnantWomenRegisteredAndScreened: r.pregnantWomenRegisteredAndScreened,
        deliveryAndOutcomes: r.deliveryAndOutcomes,
        infants0To24Months: r.infants0To24Months,
      }) satisfies IntelligenceCorrelationRow,
  );
  const seriesBundle = buildIntelligencePerAssessmentSeries(corrRows);
  const presets = buildIntelligenceCorrelationPresets(seriesBundle);

  const extendedMatrix = correlationMatrix({
    anemia_pre: seriesBundle.anemiaPre,
    bmi_pre: seriesBundle.bmiPre,
    anemia_preg: seriesBundle.anemiaPreg,
    bmi_preg: seriesBundle.bmiPreg,
    preterm: seriesBundle.preterm,
    lbw: seriesBundle.lbw,
    live_births: seriesBundle.live,
    anc_reg: seriesBundle.ancReg,
    institutional: seriesBundle.institutional,
    diabetes: seriesBundle.diabetes,
    hypertension: seriesBundle.hypertension,
    ebf: seriesBundle.ebf,
    wt_ok: seriesBundle.wtOk,
  });

  const binaryAnemiaPreterm = rows.map((_, i) => ({
    exposed: seriesBundle.anemiaPreg[i]! > 0,
    outcome: seriesBundle.preterm[i]! > 0,
  }));
  let a = 0,
    b = 0,
    c = 0,
    d = 0;
  for (const x of binaryAnemiaPreterm) {
    if (x.exposed && x.outcome) a++;
    else if (x.exposed && !x.outcome) b++;
    else if (!x.exposed && x.outcome) c++;
    else d++;
  }
  const chiAnemiaPreterm = chiSquare2x2({ a, b, c, d });
  const rrAnemiaPreterm = riskRatio2x2({ a, b, c, d });

  const scatterRegression = {
    anc_vs_institutional: (() => {
      const xs = seriesBundle.ancReg;
      const ys = seriesBundle.institutional;
      const reg = linearRegression(xs, ys);
      const points = rows.map((r, i) => ({
        assessmentId: r.id,
        x: xs[i]!,
        y: ys[i]!,
      }));
      return { ...reg, points };
    })(),
    anemia_vs_lbw: (() => {
      const xs = seriesBundle.anemiaPreg;
      const ys = seriesBundle.lbw;
      return { ...linearRegression(xs, ys), points: rows.map((r, i) => ({ assessmentId: r.id, x: xs[i]!, y: ys[i]! })) };
    })(),
  };

  /** Cohorts & monthly series — single calendar-month alignment across sections */
  const byMonth = aggregateRowsByMonth(rows);

  const cohortRegistration = byMonth.map(({ month, periodStart, rows: rs }) => {
    const flat = rs.map((r) => r.pregnantWomenRegisteredAndScreened).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS as unknown as string[]);
    return {
      cohortMonth: month,
      periodStart,
      total_anc_registered: t.total_anc_registered,
      hiv_tested: t.hiv_tested,
      hemoglobin_tested_4_times: t.hemoglobin_tested_4_times,
    };
  });

  const cohortDelivery = byMonth.map(({ month, rows: rs }) => {
    const flat = rs.map((r) => r.deliveryAndOutcomes).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], DELIVERY_AND_OUTCOMES_FIELDS as unknown as string[]);
    return {
      cohortMonth: month,
      live_births: t.live_births,
      lbw_rate: lbwRate(t.lbw_lt_2500g, t.live_births),
      preterm_rate: pretermRate(t.preterm_births_lt_37_weeks, t.live_births),
      maternal_mortality_rate: mortalityRate(t.maternal_deaths, t.live_births),
    };
  });

  const cohortInfant = byMonth.map(({ month, rows: rs }) => {
    const flat = rs.map((r) => r.infants0To24Months).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], INFANTS_0_TO_24_MONTHS_FIELDS as unknown as string[]);
    return {
      cohortMonth: month,
      fully_immunized: t.fully_immunized_12_23_months,
      ebf: t.ebf_0_6_months,
      retention_proxy: t.adequate_weight_gain_0_24_months,
    };
  });

  const delMap = new Map(cohortDelivery.map((c) => [c.cohortMonth, c]));
  const infMap = new Map(cohortInfant.map((c) => [c.cohortMonth, c]));
  const cohortMatrix = cohortRegistration.map((r) => ({
    month: r.cohortMonth,
    anc: r.total_anc_registered,
    live_births: delMap.get(r.cohortMonth)?.live_births ?? null,
    immunized: infMap.get(r.cohortMonth)?.fully_immunized ?? null,
  }));

  const retentionCurve = byMonth.map(({ month, rows: rs }) => {
    const flat = rs.map((r) => r.postnatalWomen).filter(Boolean) as object[];
    const p = sumFields(flat as Parameters<typeof sumFields>[0], POSTNATAL_WOMEN_FIELDS as unknown as string[]);
    const delSum = rs.reduce((s, row) => s + (row.deliveryAndOutcomes?.registered_mothers_delivered ?? 0), 0);
    const rate = delSum > 0 ? p.postpartum_checkup_48h_to_14d / delSum : null;
    return { month, postpartum_checkup_rate: rate, hbnc: p.hbnc_visits };
  });

  /** Time series — monthly KPIs with moving averages & trend */
  const monthlyHivRate = byMonth.map(({ rows: rs }) => {
    const flat = rs.map((r) => r.pregnantWomenRegisteredAndScreened).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS as unknown as string[]);
    const d = t.total_anc_registered;
    return d > 0 ? t.hiv_tested / d : null;
  });
  const monthlyLbwRate = byMonth.map(({ rows: rs }) => {
    const flat = rs.map((r) => r.deliveryAndOutcomes).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], DELIVERY_AND_OUTCOMES_FIELDS as unknown as string[]);
    return lbwRate(t.lbw_lt_2500g, t.live_births);
  });
  const monthlyMatMort = byMonth.map(({ rows: rs }) => {
    const flat = rs.map((r) => r.deliveryAndOutcomes).filter(Boolean) as object[];
    const t = sumFields(flat as Parameters<typeof sumFields>[0], DELIVERY_AND_OUTCOMES_FIELDS as unknown as string[]);
    return mortalityRate(t.maternal_deaths, t.live_births);
  });

  const hivVals = monthlyHivRate.map((v) => (v === null ? 0 : v));
  const lbwVals = monthlyLbwRate.map((v) => (v === null ? 0 : v));

  const trendHiv = classifyTrend(hivVals);
  const trendLbw = classifyTrend(lbwVals);

  const seasonalityHiv = seasonalIndicesByMonth(
    byMonth.map((b, i) => ({
      month: new Date(b.periodStart).getUTCMonth() + 1,
      value: monthlyHivRate[i] ?? 0,
    })),
  );

  const spikeIdxHiv = zScoreSpikeIndices(hivVals, 2);
  const spikeIdxLbw = zScoreSpikeIndices(lbwVals, 2);

  const timeSeriesBundle = {
    months: byMonth.map((b) => b.month),
    hiv_screening_rate: monthlyHivRate,
    hiv_ma3: movingAverage(hivVals, 3),
    lbw_rate: monthlyLbwRate,
    lbw_ma3: movingAverage(lbwVals, 3),
    maternal_mortality_rate: monthlyMatMort,
    trend: { hiv_screening: trendHiv, lbw: trendLbw },
    seasonality_index_hiv: seasonalityHiv,
    spikes: {
      hiv_screening_indices: spikeIdxHiv,
      lbw_rate_indices: spikeIdxLbw,
    },
  };

  /** Distributions (aggregate shares — histogram-style categories from schema) */
  const bmiPregDist = distributionShares(pregIdTot as Record<string, number>, [
    "bmi_lt_18_5",
    "bmi_lt_25",
    "inadequate_gestational_weight_gain",
  ] as unknown as string[]);
  const anemiaPregDist = distributionShares(pregIdTot as Record<string, number>, [
    "severe_anemia_hb_lt_7",
    "moderate_anemia_hb_7_to_9_9",
  ] as unknown as string[]);
  const bwDist = distributionShares(delTot as Record<string, number>, [
    "vlbw_lt_1500g",
    "lbw_lt_2500g",
  ] as unknown as string[]);
  const liveTotal = delTot.live_births;
  const normalBirthWeightApprox = Math.max(0, liveTotal - delTot.lbw_lt_2500g);

  /** Multivariate bubbles: ANC + diabetes → institutional share */
  const multivariateBubbles = rows.map((r) => {
    const anc = r.pregnantWomenRegisteredAndScreened?.total_anc_registered ?? 0;
    const dm = r.pregnantWomenIdentified?.diabetes_mellitus ?? 0;
    const d = r.deliveryAndOutcomes;
    const instC = d ? d.institutional_delivery_facility + d.institutional_delivery_other : 0;
    const tot = d ? d.institutional_delivery_facility + d.institutional_delivery_other + d.home_deliveries : 0;
    const instRate = tot > 0 ? instC / tot : null;
    return { assessmentId: r.id, anc_registered: anc, diabetes_identified: dm, institutional_rate: instRate };
  });

  const multiAxisScatter = rows.map((r) => {
    const anc = r.pregnantWomenRegisteredAndScreened?.total_anc_registered ?? 0;
    const og = r.pregnantWomenRegisteredAndScreened?.gdm_ogtt_tested ?? 0;
    const d = r.deliveryAndOutcomes;
    const tot = d ? d.institutional_delivery_facility + d.institutional_delivery_other + d.home_deliveries : 0;
    const instC = d ? d.institutional_delivery_facility + d.institutional_delivery_other : 0;
    return {
      assessmentId: r.id,
      x: anc,
      y: og,
      z: tot > 0 ? instC / tot : null,
    };
  });

  /** KPI cards with simple half-window delta */
  const mid = Math.floor(monthlyHivRate.length / 2);
  const firstHiv = monthlyHivRate.slice(0, mid).filter((x): x is number => x !== null);
  const secondHiv = monthlyHivRate.slice(mid).filter((x): x is number => x !== null);
  const firstLbw = monthlyLbwRate.slice(0, mid).filter((x): x is number => x !== null);
  const secondLbw = monthlyLbwRate.slice(mid).filter((x): x is number => x !== null);
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const kpiDeltas = {
    hiv_screening_pp: mean(firstHiv) !== null && mean(secondHiv) !== null ? mean(secondHiv)! - mean(firstHiv)! : null,
    lbw_rate_pp: mean(firstLbw) !== null && mean(secondLbw) !== null ? mean(secondLbw)! - mean(firstLbw)! : null,
  };

  /** Anomalies — multiple methods on HIV-tested series and live births */
  const hivTestsSeries = rows.map((r) => r.pregnantWomenRegisteredAndScreened?.hiv_tested ?? 0);
  const liveBirthsSeries = rows.map((r) => r.deliveryAndOutcomes?.live_births ?? 0);
  const zHiv = detectAnomalies(hivTestsSeries, 2.5).map((x) => ({
    ...x,
    assessmentId: rows[x.index]?.id,
    facility: rows[x.index]?.facility?.name,
    method: "z_score" as const,
  }));
  const zLive = detectAnomalies(liveBirthsSeries, 2.5).map((x) => ({
    ...x,
    assessmentId: rows[x.index]?.id,
    facility: rows[x.index]?.facility?.name,
    method: "z_score" as const,
  }));
  const iqrHiv = detectIqrOutliers(hivTestsSeries).map((x) => ({
    index: x.index,
    value: x.value,
    assessmentId: rows[x.index]?.id,
    facility: rows[x.index]?.facility?.name,
    method: "iqr" as const,
    bounds: { low: x.low, high: x.high },
  }));
  const isoHiv = isolationForestScores1D(hivTestsSeries);
  const isoIdx = topIsolationAnomalyIndices(isoHiv, 0.12).map((index) => ({
    index,
    score: isoHiv[index],
    value: hivTestsSeries[index],
    assessmentId: rows[index]?.id,
    facility: rows[index]?.facility?.name,
    method: "isolation_forest" as const,
  }));

  /** Cross-entity linking (same assessment lifecycle) */
  const crossEntity = {
    mother_infant: rows.map((r) => ({
      assessmentId: r.id,
      live_births: r.deliveryAndOutcomes?.live_births ?? 0,
      ebf_0_6m: r.infants0To24Months?.ebf_0_6_months ?? 0,
      infant_immunized: r.infants0To24Months?.fully_immunized_12_23_months ?? 0,
      maternal_deaths: r.deliveryAndOutcomes?.maternal_deaths ?? 0,
    })),
    lifecycle_chain: {
      anc_registered: regTot.total_anc_registered,
      high_risk_flags: hrTot as Record<string, number>,
      mothers_delivered: delTot.registered_mothers_delivered,
      postnatal_checkup: postTot.postpartum_checkup_48h_to_14d,
      infant_immunized: infTot.fully_immunized_12_23_months,
    },
  };

  const sankeyLinks = pipelines.flatMap((p) => {
    const stages = p.stages;
    const links: Array<{ pipeline: string; source: string; target: string; value: number }> = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i]!;
      const b = stages[i + 1]!;
      const flow = Math.min(a.count, b.count);
      links.push({
        pipeline: p.key,
        source: `${p.key}:${a.id}`,
        target: `${p.key}:${b.id}`,
        value: flow,
      });
    }
    return links;
  });

  const insightBlock = deterministicIntelligenceInsights({
    pipelines,
    screeningGap: screenedGap,
    treatmentGapPregnancy: treatmentGap,
    outcomeGap,
    kpis: {
      hiv_screening: sr.screening_rate_hiv,
      hgb_screening: sr.screening_rate_hgb_4x,
      maternal_mortality: matR,
      lbw: lbwR,
      institutional_delivery: instR,
    },
    trendLabels: { hiv: trendHiv, lbw: trendLbw },
    anomalyCount: zHiv.length + zLive.length + iqrHiv.length + isoIdx.length,
  });

  return {
    meta: {
      assessmentCount: rows.length,
      filters: f,
      computedAt: new Date().toISOString(),
    },
    pipelines,
    sankey_links: sankeyLinks,
    gaps: {
      screening: { label: "ANC eligible − HIV tested", ...screenedGap },
      treatment_pregnancy: { label: "Pregnancy identified sum − managed sum", ...treatmentGap },
      outcome: {
        label: "Mothers delivered + growth success proxy − bundled positive outcome",
        ...outcomeGap,
      },
      management_tables: mg,
      district_heatmap: districtGapRows.slice(0, 30),
    },
    correlation_engine: {
      presets,
      extended_matrix: extendedMatrix,
      chi_square: {
        anemia_exposed_vs_preterm: { table: { a, b, c, d }, ...chiAnemiaPreterm, risk_ratio: rrAnemiaPreterm },
      },
      scatter_regression: scatterRegression,
    },
    cohorts: {
      registration_month: cohortRegistration,
      delivery_month: cohortDelivery,
      infant_birth_cohort: cohortInfant,
      matrix: cohortMatrix,
      retention: retentionCurve,
    },
    time_series: timeSeriesBundle,
    distributions: {
      pregnancy_bmi_bands: bmiPregDist,
      pregnancy_anemia_severity: anemiaPregDist,
      birth_weight_bands: [...bwDist, { label: "normal_weight_approx", absolute: normalBirthWeightApprox, shareOfSection: liveTotal > 0 ? (normalBirthWeightApprox / liveTotal) * 100 : 0 }],
    },
    multivariate: { bubbles: multivariateBubbles, anc_ogtt_institutional: multiAxisScatter },
    kpis: {
      mortality_rate_maternal_per_live_birth: matR,
      early_neonatal_mortality_rate: earlyNeonatalMortalityRate(
        delTot.early_neonatal_deaths_lt_24hrs,
        delTot.live_births,
      ),
      lbw_rate: lbwR,
      preterm_rate: pretermRate(delTot.preterm_births_lt_37_weeks, delTot.live_births),
      institutional_delivery_ratio: instR,
      screening_coverage_hiv: sr.screening_rate_hiv,
      screening_coverage_hgb_4x: sr.screening_rate_hgb_4x,
      screening_coverage_bp: sr.screening_rate_bp,
      treatment_success_proxy: pregIdentSum > 0 ? pregManSum / pregIdentSum : null,
      deltas_half_window: kpiDeltas,
    },
    anomalies: {
      z_score: { hiv_tested: zHiv, live_births: zLive },
      iqr: { hiv_tested: iqrHiv },
      isolation_forest: { hiv_tested: isoIdx },
    },
    cross_entity: crossEntity,
    insights: insightBlock,
  };
}
