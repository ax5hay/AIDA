import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { Prisma } from "@aida/db";
import {
  DELIVERY_AND_OUTCOMES_FIELDS,
  HIGH_RISK_PREGNANCY_FIELDS,
  INFANTS_0_TO_24_MONTHS_FIELDS,
  POSTNATAL_WOMEN_FIELDS,
  PREGNANT_WOMEN_IDENTIFIED_FIELDS,
  PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS,
  PRECONCEPTION_INTERVENTIONS_FIELDS,
  PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
  buildTimeSeries,
  distributionShares,
  earlyNeonatalMortalityRate,
  buildFieldMetricsForSection,
  monthlyDenominatorForField,
  institutionalDeliveryRatio,
  lbwRate,
  managementGaps,
  mortalityRate,
  pretermRate,
  screeningRates,
  sumFields,
  validateManagedVsIdentified,
  validateScreeningVsRegistered,
  correlationCoefficient,
  COMPARISON_METRICS,
  buildCompatibilityMatrix,
  getMetricDef,
  canCompareMetrics,
  canTripleMetric,
  selectChartKind,
  buildInsightSummary,
  pearsonSignificance,
  leastSquaresRegression,
  groupNumericByCategory,
  anovaPValue,
  chiSquareContingency,
  type ComparisonMetricDef,
  type ValidationIssue,
} from "@aida/analytics-engine";
import { correlationMatrix, detectAnomalies, type AnomalyFlag } from "@aida/ml-engine";
import { PrismaService } from "../prisma/prisma.service";
import {
  ANOMALIES_SELECT,
  ASSESSMENT_OVERVIEW_SELECT,
  CORRELATIONS_SELECT,
  EXPLORER_SELECT,
  INTELLIGENCE_SELECT,
  ASSESSMENT_SECTION_SELECTS,
} from "./assessment-selects";
import { buildDecisionSupportBundle } from "./decision-support-aggregator";
import { buildPublicHealthIntelligence } from "./intelligence-aggregator";
import { ASSESSMENT_ANALYTICS_INCLUDE, type FacilityAssessmentAnalytics } from "./assessment-include";
import type { ExplorerFilters } from "./analytics-filters";
import { extractComparisonMetric } from "./comparison-lab-metrics";

/** Prisma nested rows include id/assessmentId; analytics helpers expect numeric field maps. */
function asNumericRecord(obj: object | null | undefined): Record<string, number> | undefined {
  if (obj == null) return undefined;
  return obj as unknown as Record<string, number>;
}

export type { ExplorerFilters } from "./analytics-filters";

@Injectable()
export class AnalyticsService {
  private readonly maxAnalyticsRows = Number(process.env.MAX_ANALYTICS_ROWS ?? 5000);
  private readonly maxExplorerPageSize = Number(process.env.MAX_EXPLORER_PAGE_SIZE ?? 500);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private async findManyCapped<T>(
    label: string,
    args: Omit<Prisma.ChcAssessmentFindManyArgs, "take">,
  ): Promise<T[]> {
    const rows = (await this.prisma.chcAssessment.findMany({
      ...args,
      take: this.maxAnalyticsRows + 1,
    })) as T[];
    if (rows.length > this.maxAnalyticsRows) {
      throw new BadRequestException(
        `Query too large for ${label}. Narrow filters or reduce date window (max ${this.maxAnalyticsRows} rows).`,
      );
    }
    return rows;
  }

  private cacheKey(prefix: string, f: ExplorerFilters): string {
    return `${prefix}:${f.from ?? ""}:${f.to ?? ""}:${f.district ?? ""}:${f.facilityId ?? ""}`;
  }

  private whereClause(f: ExplorerFilters): Prisma.ChcAssessmentWhereInput {
    const period: Prisma.DateTimeFilter = {};
    if (f.from) {
      const fromDate = new Date(f.from);
      if (Number.isNaN(fromDate.getTime())) {
        throw new BadRequestException("Invalid from date");
      }
      period.gte = fromDate;
    }
    if (f.to) {
      const toDate = new Date(f.to);
      if (Number.isNaN(toDate.getTime())) {
        throw new BadRequestException("Invalid to date");
      }
      period.lte = toDate;
    }
    const where: Prisma.ChcAssessmentWhereInput = {};
    if (f.from || f.to) where.periodStart = period;
    if (f.facilityId) where.facilityId = f.facilityId;
    if (f.district) where.facility = { is: { district: f.district } };
    return where;
  }

  async intelligence(f: ExplorerFilters) {
    const key = this.cacheKey("intelligence", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof INTELLIGENCE_SELECT }>>("intelligence", {
      where: this.whereClause(f),
      select: INTELLIGENCE_SELECT,
      orderBy: { periodStart: "asc" },
    });

    const payload = buildPublicHealthIntelligence(rows, f);
    await this.cache.set(key, payload, 60_000);
    return payload;
  }

  /** Decision support: recommendations, health score, alerts, what-if, quality, benchmarks, story — same filters as analytics */
  async decisionSupport(f: ExplorerFilters) {
    const key = this.cacheKey("decision-support", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof INTELLIGENCE_SELECT }>>("decision-support", {
      where: this.whereClause(f),
      select: INTELLIGENCE_SELECT,
      orderBy: { periodStart: "asc" },
    });

    const intel = buildPublicHealthIntelligence(rows, f);
    const validationIssues = rows.flatMap((r) => {
      const issues: ValidationIssue[] = [];
      const s = r.pregnantWomenRegisteredAndScreened;
      if (s) {
        const { total_anc_registered, ...rest } = s;
        issues.push(
          ...validateScreeningVsRegistered(total_anc_registered, asNumericRecord(rest) ?? {}),
        );
      }
      const pi = r.preconceptionWomenIdentified;
      const pm = r.preconceptionWomenManaged;
      if (pi && pm) {
        issues.push(
          ...validateManagedVsIdentified(
            asNumericRecord(pi) ?? {},
            asNumericRecord(pm) ?? {},
            "preconception",
          ),
        );
      }
      const pgi = r.pregnantWomenIdentified;
      const pgm = r.pregnantWomenManaged;
      if (pgi && pgm) {
        issues.push(
          ...validateManagedVsIdentified(
            asNumericRecord(pgi) ?? {},
            asNumericRecord(pgm) ?? {},
            "pregnancy",
          ),
        );
      }
      return issues;
    });

    const payload = buildDecisionSupportBundle(rows, intel, validationIssues.length, f);
    await this.cache.set(key, payload, 45_000);
    return payload;
  }

  async overview(f: ExplorerFilters) {
    const key = this.cacheKey("overview", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof ASSESSMENT_OVERVIEW_SELECT }>>("overview", {
      where: this.whereClause(f),
      select: ASSESSMENT_OVERVIEW_SELECT,
      orderBy: { periodStart: "asc" },
    });

    const preIdRows = rows
      .map((r) => r.preconceptionWomenIdentified)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const preManRows = rows
      .map((r) => r.preconceptionWomenManaged)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const pregIdRows = rows
      .map((r) => r.pregnantWomenIdentified)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const pregManRows = rows
      .map((r) => r.pregnantWomenManaged)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const regRows = rows
      .map((r) => r.pregnantWomenRegisteredAndScreened)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const delRows = rows
      .map((r) => r.deliveryAndOutcomes)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const intRows = rows
      .map((r) => r.preconceptionInterventions)
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const preIdTot = sumFields(preIdRows, PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS);
    const preManTot = sumFields(preManRows, PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS);
    const pregIdTot = sumFields(pregIdRows, PREGNANT_WOMEN_IDENTIFIED_FIELDS);
    const pregManTot = sumFields(pregManRows, PREGNANT_WOMEN_IDENTIFIED_FIELDS);
    const regTot = sumFields(regRows, PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS);
    const delTot = sumFields(delRows, DELIVERY_AND_OUTCOMES_FIELDS);

    const gaps = managementGaps(
      preIdTot as Record<string, number>,
      preManTot as Record<string, number>,
      pregIdTot as Record<string, number>,
      pregManTot as Record<string, number>,
      PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[],
      PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[],
    );

    const sr = screeningRates(regTot as Parameters<typeof screeningRates>[0]);

    const matR = mortalityRate(delTot.maternal_deaths, delTot.live_births);
    const neoR = earlyNeonatalMortalityRate(delTot.early_neonatal_deaths_lt_24hrs, delTot.live_births);
    const instR = institutionalDeliveryRatio(
      delTot.institutional_delivery_facility,
      delTot.institutional_delivery_other,
      delTot.home_deliveries,
    );
    const lbwR = lbwRate(delTot.lbw_lt_2500g, delTot.live_births);
    const ptR = pretermRate(delTot.preterm_births_lt_37_weeks, delTot.live_births);

    const alerts: Array<{ severity: "info" | "warning" | "critical"; action: string }> = [];
    if (matR !== null && matR > 0.002) {
      alerts.push({
        severity: "critical",
        action:
          "Maternal mortality signal is elevated vs live births — review high-risk triage, referral, and facility delivery pathways.",
      });
    }
    if (sr.screening_rate_hiv !== null && sr.screening_rate_hiv < 0.85) {
      alerts.push({
        severity: "warning",
        action:
          "ANC HIV screening coverage is below target — prioritize testing workflow and supply continuity for antenatal HIV tests.",
      });
    }
    if (sr.screening_rate_hgb_4x !== null && sr.screening_rate_hgb_4x < 0.75) {
      alerts.push({
        severity: "warning",
        action:
          "Hemoglobin testing frequency is low — strengthen anemia surveillance across trimesters (hemoglobin_tested_4_times vs total_anc_registered).",
      });
    }

    const validationIssues = rows.flatMap((r) => {
      const issues: ValidationIssue[] = [];
      const s = r.pregnantWomenRegisteredAndScreened;
      if (s) {
        const { total_anc_registered, ...rest } = s;
        issues.push(
          ...validateScreeningVsRegistered(total_anc_registered, asNumericRecord(rest) ?? {}),
        );
      }
      const pi = r.preconceptionWomenIdentified;
      const pm = r.preconceptionWomenManaged;
      if (pi && pm) {
        issues.push(
          ...validateManagedVsIdentified(
            asNumericRecord(pi) ?? {},
            asNumericRecord(pm) ?? {},
            "preconception",
          ),
        );
      }
      const pgi = r.pregnantWomenIdentified;
      const pgm = r.pregnantWomenManaged;
      if (pgi && pgm) {
        issues.push(
          ...validateManagedVsIdentified(
            asNumericRecord(pgi) ?? {},
            asNumericRecord(pgm) ?? {},
            "pregnancy",
          ),
        );
      }
      return issues;
    });

    const facilityIds = new Set(rows.map((r) => r.facilityId));
    const districts = new Set(
      rows.map((r) => r.facility?.district).filter((d): d is string => Boolean(d)),
    );
    const periodStarts = rows.map((r) => r.periodStart.getTime());
    const periodStartMin =
      periodStarts.length > 0 ? new Date(Math.min(...periodStarts)).toISOString().slice(0, 10) : null;
    const periodStartMax =
      periodStarts.length > 0 ? new Date(Math.max(...periodStarts)).toISOString().slice(0, 10) : null;

    const sectionCoverage = {
      preconception_women_identified: rows.filter((r) => r.preconceptionWomenIdentified != null).length,
      preconception_interventions: rows.filter((r) => r.preconceptionInterventions != null).length,
      preconception_women_managed: rows.filter((r) => r.preconceptionWomenManaged != null).length,
      pregnant_women_registered_and_screened: rows.filter((r) => r.pregnantWomenRegisteredAndScreened != null)
        .length,
      pregnant_women_identified: rows.filter((r) => r.pregnantWomenIdentified != null).length,
      pregnant_women_managed: rows.filter((r) => r.pregnantWomenManaged != null).length,
      delivery_and_outcomes: rows.filter((r) => r.deliveryAndOutcomes != null).length,
    };

    const reg = regTot as Record<string, number>;
    const ancNumerators = {
      denominator_total_anc_registered: reg.total_anc_registered ?? 0,
      hiv_tested: reg.hiv_tested ?? 0,
      hemoglobin_tested_4_times: reg.hemoglobin_tested_4_times ?? 0,
      blood_pressure_checked: reg.blood_pressure_checked ?? 0,
      cbc_tested: reg.cbc_tested ?? 0,
      gdm_ogtt_tested: reg.gdm_ogtt_tested ?? 0,
      thyroid_tsh_tested: reg.thyroid_tsh_tested ?? 0,
      syphilis_tested: reg.syphilis_tested ?? 0,
      urine_routine_microscopy: reg.urine_routine_microscopy ?? 0,
      blood_grouping: reg.blood_grouping ?? 0,
    };

    const del = delTot as Record<string, number>;
    const outcomeDenominators = {
      live_births: del.live_births ?? 0,
      maternal_deaths: del.maternal_deaths ?? 0,
      early_neonatal_deaths_lt_24hrs: del.early_neonatal_deaths_lt_24hrs ?? 0,
      lbw_lt_2500g: del.lbw_lt_2500g ?? 0,
      preterm_births_lt_37_weeks: del.preterm_births_lt_37_weeks ?? 0,
    };

    const payload = {
      meta: {
        assessmentCount: rows.length,
        facilityCount: facilityIds.size,
        districtCount: districts.size,
        periodStartMin,
        periodStartMax,
        filters: f,
      },
      corpus: {
        sectionCoverage,
        ancNumerators,
        outcomeDenominators,
      },
      kpis: {
        screening_rates: sr,
        management_gap: gaps,
        mortality_rate_maternal_per_live_birth: matR,
        early_neonatal_mortality_rate_per_live_birth: neoR,
        institutional_delivery_ratio: instR,
        lbw_rate: lbwR,
        preterm_rate: ptR,
      },
      funnel: {
        preconception: {
          identified_total: PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS.reduce(
            (s: number, k: string) => s + ((preIdTot as Record<string, number>)[k] ?? 0),
            0,
          ),
          managed_total: PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS.reduce(
            (s: number, k: string) => s + ((preManTot as Record<string, number>)[k] ?? 0),
            0,
          ),
          interventions: sumFields(intRows, PRECONCEPTION_INTERVENTIONS_FIELDS),
        },
        pregnancy: {
          registered_total: regTot.total_anc_registered,
          identified_total: PREGNANT_WOMEN_IDENTIFIED_FIELDS.reduce(
            (s: number, k: string) => s + ((pregIdTot as Record<string, number>)[k] ?? 0),
            0,
          ),
          managed_total: PREGNANT_WOMEN_IDENTIFIED_FIELDS.reduce(
            (s: number, k: string) => s + ((pregManTot as Record<string, number>)[k] ?? 0),
            0,
          ),
        },
        outcomes: {
          live_births: delTot.live_births,
          maternal_deaths: delTot.maternal_deaths,
          early_neonatal_deaths_lt_24hrs: delTot.early_neonatal_deaths_lt_24hrs,
        },
      },
      alerts,
      validation: { issues: validationIssues },
    };

    await this.cache.set(key, payload, 30_000);
    return payload;
  }

  private monthBuckets<T extends { periodStart: Date }>(
    rows: T[],
    pick: (r: T) => Record<string, number> | null | undefined,
  ) {
    const map = new Map<string, { periodStart: Date; rows: Array<Record<string, number>> }>();
    for (const r of rows) {
      const d = r.periodStart;
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!map.has(k)) map.set(k, { periodStart: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), rows: [] });
      const row = pick(r);
      if (row) map.get(k)!.rows.push(row);
    }
    return [...map.values()].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  }

  async section(section: string, f: ExplorerFilters) {
    const key = this.cacheKey(`section:${section}`, f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const select = ASSESSMENT_SECTION_SELECTS[section];
    if (!select) {
      throw new NotFoundException(`Unknown section: ${section}`);
    }

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof select }>>(`section:${section}`, {
      where: this.whereClause(f),
      select,
      orderBy: { periodStart: "asc" },
    });

    const pickers: Record<
      string,
      (r: FacilityAssessmentAnalytics) => Record<string, number> | null | undefined
    > = {
      preconception_women_identified: (r) => asNumericRecord(r.preconceptionWomenIdentified),
      preconception_interventions: (r) => asNumericRecord(r.preconceptionInterventions),
      preconception_women_managed: (r) => asNumericRecord(r.preconceptionWomenManaged),
      pregnant_women_registered_and_screened: (r) =>
        asNumericRecord(r.pregnantWomenRegisteredAndScreened),
      pregnant_women_identified: (r) => asNumericRecord(r.pregnantWomenIdentified),
      pregnant_women_managed: (r) => asNumericRecord(r.pregnantWomenManaged),
      high_risk_pregnancy: (r) => asNumericRecord(r.highRiskPregnancy),
      delivery_and_outcomes: (r) => asNumericRecord(r.deliveryAndOutcomes),
      infants_0_to_24_months: (r) => asNumericRecord(r.infants0To24Months),
      postnatal_women: (r) => asNumericRecord(r.postnatalWomen),
    };

    const keys: Record<string, readonly string[]> = {
      preconception_women_identified: PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
      preconception_interventions: PRECONCEPTION_INTERVENTIONS_FIELDS,
      preconception_women_managed: PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
      pregnant_women_registered_and_screened: PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS,
      pregnant_women_identified: PREGNANT_WOMEN_IDENTIFIED_FIELDS,
      pregnant_women_managed: PREGNANT_WOMEN_IDENTIFIED_FIELDS,
      high_risk_pregnancy: HIGH_RISK_PREGNANCY_FIELDS,
      delivery_and_outcomes: DELIVERY_AND_OUTCOMES_FIELDS,
      infants_0_to_24_months: INFANTS_0_TO_24_MONTHS_FIELDS,
      postnatal_women: POSTNATAL_WOMEN_FIELDS,
    };

    const fieldList = keys[section];
    const pick = pickers[section];
    if (!fieldList || !pick) {
      throw new NotFoundException(`Unknown section: ${section}`);
    }

    const flat = rows
      .map((r) => pick(r as FacilityAssessmentAnalytics))
      .filter((x): x is Record<string, number> => x !== null && x !== undefined);
    const totals = sumFields(flat, fieldList as unknown as string[]);

    const metrics = buildFieldMetricsForSection(
      section,
      totals as Record<string, number>,
      fieldList as unknown as string[],
    );
    const distribution = distributionShares(totals as Record<string, number>, fieldList as unknown as string[]);

    const buckets = this.monthBuckets(rows, (r) => pick(r as FacilityAssessmentAnalytics) ?? null);
    const timeSeries = (fieldList as readonly string[]).map((field) => ({
      field,
      points: buildTimeSeries(
        buckets.map((b) => ({ periodStart: b.periodStart, rows: b.rows })),
        field,
        (i: number) => {
          const b = buckets[i];
          const t = sumFields(b.rows, fieldList as unknown as string[]);
          return monthlyDenominatorForField(section, field, t as Record<string, number>, fieldList as unknown as string[]);
        },
      ),
    }));

    const comparativeDistribution = distribution;

    const payload = {
      section,
      totals,
      fieldMetrics: metrics,
      comparativeDistribution,
      timeSeries,
    };
    await this.cache.set(key, payload, 30_000);
    return payload;
  }

  async correlations(f: ExplorerFilters) {
    const key = this.cacheKey("correlations", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof CORRELATIONS_SELECT }>>("correlations", {
      where: this.whereClause(f),
      select: CORRELATIONS_SELECT,
      orderBy: { periodStart: "asc" },
    });
    const anemiaPre = rows.map((r) => {
      const p = r.preconceptionWomenIdentified;
      if (!p) return 0;
      return p.severe_anemia_hb_lt_8 + p.moderate_anemia_hb_8_to_11_99;
    });
    const bmiPre = rows.map((r) => {
      const p = r.preconceptionWomenIdentified;
      if (!p) return 0;
      return p.bmi_lt_16 + p.bmi_16_to_18_49 + p.bmi_18_5_to_lt_21;
    });
    const anemiaPreg = rows.map((r) => {
      const p = r.pregnantWomenIdentified;
      if (!p) return 0;
      return p.severe_anemia_hb_lt_7 + p.moderate_anemia_hb_7_to_9_9;
    });
    const bmiPreg = rows.map((r) => {
      const p = r.pregnantWomenIdentified;
      if (!p) return 0;
      return p.bmi_lt_18_5 + p.bmi_lt_25;
    });

    const sorted = [...rows].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
    const mid = Math.max(1, Math.floor(sorted.length / 2));
    const beforeRows = sorted.slice(0, mid);
    const afterRows = sorted.slice(mid);

    const buildAnemiaBmiSeries = (subset: typeof sorted) => {
      const ap = subset.map((r) => {
        const p = r.preconceptionWomenIdentified;
        if (!p) return 0;
        return p.severe_anemia_hb_lt_8 + p.moderate_anemia_hb_8_to_11_99;
      });
      const bp = subset.map((r) => {
        const p = r.preconceptionWomenIdentified;
        if (!p) return 0;
        return p.bmi_lt_16 + p.bmi_16_to_18_49 + p.bmi_18_5_to_lt_21;
      });
      const apg = subset.map((r) => {
        const p = r.pregnantWomenIdentified;
        if (!p) return 0;
        return p.severe_anemia_hb_lt_7 + p.moderate_anemia_hb_7_to_9_9;
      });
      const bpg = subset.map((r) => {
        const p = r.pregnantWomenIdentified;
        if (!p) return 0;
        return p.bmi_lt_18_5 + p.bmi_lt_25;
      });
      return {
        pre_r: correlationCoefficient(ap, bp),
        preg_r: correlationCoefficient(apg, bpg),
        live_sum: subset.reduce((s, r) => s + (r.deliveryAndOutcomes?.live_births ?? 0), 0),
        n: subset.length,
      };
    };

    const beforeStats = buildAnemiaBmiSeries(beforeRows);
    const afterStats = buildAnemiaBmiSeries(afterRows);
    const cutoff = sorted[mid - 1]?.periodStart;
    const interventionComparison = {
      method: "median_period_split" as const,
      note:
        "Exploratory before/after split at the midpoint of the filtered timeline — not a randomized trial. Use for programme timing hypotheses only.",
      cutoffPeriodStart: cutoff ? cutoff.toISOString().slice(0, 10) : null,
      before: beforeStats,
      after: afterStats,
    };

    const payload = {
      anemia_vs_bmi: {
        preconception: {
          r: correlationCoefficient(anemiaPre, bmiPre),
          series: rows.map((r, i) => ({
            assessmentId: r.id,
            anemia_identified: anemiaPre[i],
            bmi_band_total: bmiPre[i],
          })),
        },
        pregnancy: {
          r: correlationCoefficient(anemiaPreg, bmiPreg),
          series: rows.map((r, i) => ({
            assessmentId: r.id,
            anemia_identified: anemiaPreg[i],
            bmi_band_total: bmiPreg[i],
          })),
        },
      },
      interventionComparison,
      matrix: correlationMatrix({
        anemia_pre: anemiaPre,
        bmi_pre: bmiPre,
        anemia_preg: anemiaPreg,
        bmi_preg: bmiPreg,
        live_births: rows.map((r) => r.deliveryAndOutcomes?.live_births ?? 0),
      }),
    };
    await this.cache.set(key, payload, 30_000);
    return payload;
  }

  async anomalies(
    metric: "live_births" | "maternal_deaths",
    f: ExplorerFilters,
    page = 1,
    pageSize = 25,
  ) {
    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof ANOMALIES_SELECT }>>("anomalies", {
      where: this.whereClause(f),
      select: ANOMALIES_SELECT,
      orderBy: { periodStart: "asc" },
    });
    const values = rows.map((r) => {
      const d = r.deliveryAndOutcomes;
      if (!d) return 0;
      return metric === "live_births" ? d.live_births : d.maternal_deaths;
    });
    const thresholdZ = 2.5;
    const flags = detectAnomalies(values, thresholdZ);
    const allPoints = flags.map((x: AnomalyFlag) => ({
      ...x,
      assessmentId: rows[x.index]?.id,
      facility: rows[x.index]?.facility?.name,
    }));
    const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
    const safeSize = Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 200 ? pageSize : 25;
    const total = allPoints.length;
    const totalPages = Math.max(1, Math.ceil(total / safeSize));
    const pagedPage = Math.min(safePage, totalPages);
    const start = (pagedPage - 1) * safeSize;
    const points = allPoints.slice(start, start + safeSize);
    return {
      metric,
      thresholdZ,
      meta: {
        page: pagedPage,
        pageSize: safeSize,
        total,
        totalPages,
        hasMore: pagedPage < totalPages,
      },
      points,
    };
  }

  async explorer(f: ExplorerFilters, page = 1, pageSize = 200) {
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException("page must be a positive integer");
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      throw new BadRequestException("pageSize must be a positive integer");
    }
    if (pageSize > this.maxExplorerPageSize) {
      throw new BadRequestException(`pageSize too large. Max ${this.maxExplorerPageSize}.`);
    }
    const where = this.whereClause(f);
    const totalCount = await this.prisma.chcAssessment.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const rows = await this.prisma.chcAssessment.findMany({
      where,
      select: EXPLORER_SELECT,
      orderBy: { periodStart: "asc" },
      skip,
      take: pageSize,
    });
    return {
      meta: {
        totalCount,
        page: safePage,
        pageSize,
        totalPages,
        hasMore: safePage < totalPages,
        returnedCount: rows.length,
        filters: {
          from: f.from,
          to: f.to,
          district: f.district,
          facilityId: f.facilityId,
        },
      },
      rows: rows.map((r) => {
        const obs = r.remarks?.observational_remarks ?? "";
        const resp = r.remarks?.respondent_remarks ?? "";
        const docSlots = [1, 2, 3, 4, 5, 6].map((n) => {
          const key = `document_${n}` as const;
          const doc = r.documents;
          const val = doc ? (doc as Record<string, string | null>)[key] : null;
          return { slot: n, key: val ?? null };
        });
        const filledSlots = docSlots.filter((s) => s.key !== null && s.key !== "").length;
        return {
          id: r.id,
          facilityId: r.facilityId,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          facility: {
            id: r.facility.id,
            name: r.facility.name,
            district: r.facility.district,
            state: r.facility.state,
          },
          remarks: {
            hasObservational: obs.length > 0,
            hasRespondent: resp.length > 0,
            observationalLength: obs.length,
            respondentLength: resp.length,
          },
          documents: { filledSlots, slots: docSlots },
          preview: {
            total_anc_registered: r.pregnantWomenRegisteredAndScreened?.total_anc_registered ?? null,
            live_births: r.deliveryAndOutcomes?.live_births ?? null,
            maternal_deaths: r.deliveryAndOutcomes?.maternal_deaths ?? null,
          },
        };
      }),
    };
  }

  async assessmentDetail(assessmentId: string) {
    const r = await this.prisma.chcAssessment.findUnique({
      where: { id: assessmentId },
      include: ASSESSMENT_ANALYTICS_INCLUDE,
    });
    if (!r) throw new NotFoundException(`Assessment not found: ${assessmentId}`);

    const strip = (obj: Record<string, unknown> | null | undefined) => {
      if (!obj) return null;
      const { id: _id, assessmentId: _aid, ...rest } = obj;
      return rest as Record<string, number | string | null>;
    };

    const validationIssues: ValidationIssue[] = [];
    const s = r.pregnantWomenRegisteredAndScreened;
    if (s) {
      const { total_anc_registered, ...rest } = s;
      validationIssues.push(
        ...validateScreeningVsRegistered(total_anc_registered, asNumericRecord(rest) ?? {}),
      );
    }
    const pi = r.preconceptionWomenIdentified;
    const pm = r.preconceptionWomenManaged;
    if (pi && pm) {
      validationIssues.push(
        ...validateManagedVsIdentified(
          asNumericRecord(pi) ?? {},
          asNumericRecord(pm) ?? {},
          "preconception",
        ),
      );
    }
    const pgi = r.pregnantWomenIdentified;
    const pgm = r.pregnantWomenManaged;
    if (pgi && pgm) {
      validationIssues.push(
        ...validateManagedVsIdentified(
          asNumericRecord(pgi) ?? {},
          asNumericRecord(pgm) ?? {},
          "pregnancy",
        ),
      );
    }

    return {
      id: r.id,
      facilityId: r.facilityId,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      facility: {
        id: r.facility.id,
        name: r.facility.name,
        district: r.facility.district,
        state: r.facility.state,
      },
      preconceptionWomenIdentified: strip(r.preconceptionWomenIdentified as unknown as Record<string, unknown>),
      preconceptionInterventions: strip(r.preconceptionInterventions as unknown as Record<string, unknown>),
      preconceptionWomenManaged: strip(r.preconceptionWomenManaged as unknown as Record<string, unknown>),
      pregnantWomenRegisteredAndScreened: strip(
        r.pregnantWomenRegisteredAndScreened as unknown as Record<string, unknown>,
      ),
      pregnantWomenIdentified: strip(r.pregnantWomenIdentified as unknown as Record<string, unknown>),
      pregnantWomenManaged: strip(r.pregnantWomenManaged as unknown as Record<string, unknown>),
      highRiskPregnancy: strip(r.highRiskPregnancy as unknown as Record<string, unknown>),
      deliveryAndOutcomes: strip(r.deliveryAndOutcomes as unknown as Record<string, unknown>),
      infants0To24Months: strip(r.infants0To24Months as unknown as Record<string, unknown>),
      postnatalWomen: strip(r.postnatalWomen as unknown as Record<string, unknown>),
      remarks: r.remarks
        ? {
            observational_remarks: r.remarks.observational_remarks,
            respondent_remarks: r.remarks.respondent_remarks,
          }
        : null,
      documents: r.documents
        ? {
            document_1: r.documents.document_1,
            document_2: r.documents.document_2,
            document_3: r.documents.document_3,
            document_4: r.documents.document_4,
            document_5: r.documents.document_5,
            document_6: r.documents.document_6,
          }
        : null,
      validationIssues,
    };
  }

  /** Aggregates assessment rows by facility district (exploratory regional comparison). */
  async districtRollup(f: ExplorerFilters) {
    const key = this.cacheKey("district-rollup", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<
      Prisma.ChcAssessmentGetPayload<{
        select: {
          facility: { select: { district: true; state: true } };
          deliveryAndOutcomes: {
            select: {
              live_births: true;
              maternal_deaths: true;
              early_neonatal_deaths_lt_24hrs: true;
            };
          };
          pregnantWomenRegisteredAndScreened: {
            select: {
              total_anc_registered: true;
              hiv_tested: true;
              hemoglobin_tested_4_times: true;
            };
          };
        };
      }>
    >("district-rollup", {
      where: this.whereClause(f),
      select: {
        facility: { select: { district: true, state: true } },
        deliveryAndOutcomes: {
          select: {
            live_births: true,
            maternal_deaths: true,
            early_neonatal_deaths_lt_24hrs: true,
          },
        },
        pregnantWomenRegisteredAndScreened: {
          select: {
            total_anc_registered: true,
            hiv_tested: true,
            hemoglobin_tested_4_times: true,
          },
        },
      },
    });

    type Agg = {
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
    const map = new Map<string, Agg>();
    for (const r of rows) {
      const d = r.facility.district;
      const cur: Agg =
        map.get(d) ??
        {
          district: d,
          state: r.facility.state,
          assessments: 0,
          live_births: 0,
          maternal_deaths: 0,
          early_neonatal_deaths: 0,
          anc_registered_total: 0,
          hiv_tested_total: 0,
          hemoglobin_4x_total: 0,
        };
      cur.assessments += 1;
      cur.live_births += r.deliveryAndOutcomes?.live_births ?? 0;
      cur.maternal_deaths += r.deliveryAndOutcomes?.maternal_deaths ?? 0;
      cur.early_neonatal_deaths += r.deliveryAndOutcomes?.early_neonatal_deaths_lt_24hrs ?? 0;
      const p = r.pregnantWomenRegisteredAndScreened;
      cur.anc_registered_total += p?.total_anc_registered ?? 0;
      cur.hiv_tested_total += p?.hiv_tested ?? 0;
      cur.hemoglobin_4x_total += p?.hemoglobin_tested_4_times ?? 0;
      map.set(d, cur);
    }
    const out = [...map.values()].sort((a, b) => b.assessments - a.assessments);
    await this.cache.set(key, out, 30_000);
    return out;
  }

  /**
   * Per-assessment pairs for scatter plots where both axes come from the same reporting row
   * (or clearly paired sections), so comparisons are interpretable.
   */
  async clinicalCrossSection(f: ExplorerFilters) {
    const key = this.cacheKey("clinical-cross-section", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<
      Prisma.ChcAssessmentGetPayload<{
        select: {
          id: true;
          pregnantWomenRegisteredAndScreened: {
            select: {
              total_anc_registered: true;
              hiv_tested: true;
              hemoglobin_tested_4_times: true;
            };
          };
          pregnantWomenIdentified: { select: { severe_anemia_hb_lt_7: true; moderate_anemia_hb_7_to_9_9: true } };
          preconceptionWomenIdentified: {
            select: { severe_anemia_hb_lt_8: true; moderate_anemia_hb_8_to_11_99: true };
          };
          preconceptionWomenManaged: {
            select: { severe_anemia_hb_lt_8: true; moderate_anemia_hb_8_to_11_99: true };
          };
          deliveryAndOutcomes: { select: { live_births: true } };
        };
      }>
    >("clinical-cross-section", {
      where: this.whereClause(f),
      select: {
        id: true,
        pregnantWomenRegisteredAndScreened: {
          select: {
            total_anc_registered: true,
            hiv_tested: true,
            hemoglobin_tested_4_times: true,
          },
        },
        pregnantWomenIdentified: {
          select: {
            severe_anemia_hb_lt_7: true,
            moderate_anemia_hb_7_to_9_9: true,
          },
        },
        preconceptionWomenIdentified: {
          select: {
            severe_anemia_hb_lt_8: true,
            moderate_anemia_hb_8_to_11_99: true,
          },
        },
        preconceptionWomenManaged: {
          select: {
            severe_anemia_hb_lt_8: true,
            moderate_anemia_hb_8_to_11_99: true,
          },
        },
        deliveryAndOutcomes: { select: { live_births: true } },
      },
    });

    const ancHgb: Array<{ assessmentId: string; total_anc_registered: number; hemoglobin_tested_4_times: number }> =
      [];
    const ancHiv: Array<{ assessmentId: string; total_anc_registered: number; hiv_tested: number }> = [];
    const pregAnemiaVsLive: Array<{
      assessmentId: string;
      pregnancy_anemia_screened: number;
      live_births: number;
    }> = [];
    const preconceptionAnemiaIdVsManaged: Array<{
      assessmentId: string;
      preconception_anemia_identified: number;
      preconception_anemia_managed: number;
    }> = [];

    for (const r of rows) {
      const anc = r.pregnantWomenRegisteredAndScreened;
      if (anc) {
        ancHgb.push({
          assessmentId: r.id,
          total_anc_registered: anc.total_anc_registered,
          hemoglobin_tested_4_times: anc.hemoglobin_tested_4_times,
        });
        ancHiv.push({
          assessmentId: r.id,
          total_anc_registered: anc.total_anc_registered,
          hiv_tested: anc.hiv_tested,
        });
      }
      const pw = r.pregnantWomenIdentified;
      const live = r.deliveryAndOutcomes?.live_births ?? 0;
      if (pw) {
        pregAnemiaVsLive.push({
          assessmentId: r.id,
          pregnancy_anemia_screened:
            (pw.severe_anemia_hb_lt_7 ?? 0) + (pw.moderate_anemia_hb_7_to_9_9 ?? 0),
          live_births: live,
        });
      }
      const pi = r.preconceptionWomenIdentified;
      const pm = r.preconceptionWomenManaged;
      if (pi && pm) {
        preconceptionAnemiaIdVsManaged.push({
          assessmentId: r.id,
          preconception_anemia_identified:
            (pi.severe_anemia_hb_lt_8 ?? 0) + (pi.moderate_anemia_hb_8_to_11_99 ?? 0),
          preconception_anemia_managed:
            (pm.severe_anemia_hb_lt_8 ?? 0) + (pm.moderate_anemia_hb_8_to_11_99 ?? 0),
        });
      }
    }

    const payload = {
      ancHgb,
      ancHiv,
      pregAnemiaVsLive,
      preconceptionAnemiaIdVsManaged,
    };
    await this.cache.set(key, payload, 30_000);
    return payload;
  }

  /** Comparison Lab: metric catalog + precomputed compatibility matrix (no DB). */
  comparisonLabCatalog() {
    return {
      metrics: COMPARISON_METRICS,
      compatibility: buildCompatibilityMatrix(COMPARISON_METRICS),
    };
  }

  /**
   * Run a guided comparison for metric A vs B (optional C for 3D bubble).
   * Cached ~30s per filter + metric tuple.
   */
  async comparisonLabRun(metricA: string, metricB: string, f: ExplorerFilters, metricC?: string) {
    const ma = getMetricDef(metricA);
    const mb = getMetricDef(metricB);
    if (!ma || !mb) {
      throw new BadRequestException("Unknown metric id.");
    }
    const pair = canCompareMetrics(ma, mb);
    if (!pair.ok) {
      throw new BadRequestException(pair.reason ?? "Incompatible metrics.");
    }
    let mc: ComparisonMetricDef | undefined;
    if (metricC) {
      const t = getMetricDef(metricC);
      if (!t) throw new BadRequestException("Unknown metric C.");
      const triple = canTripleMetric(ma, mb, t);
      if (!triple.ok) throw new BadRequestException(triple.reason);
      mc = t;
    }

    const key = this.cacheKey(`comparison-lab:${metricA}:${metricB}:${metricC ?? ""}`, f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.findManyCapped<Prisma.ChcAssessmentGetPayload<{ select: typeof INTELLIGENCE_SELECT }>>("comparison-lab", {
      where: this.whereClause(f),
      select: INTELLIGENCE_SELECT,
      orderBy: { periodStart: "asc" },
    });

    const chartKind = selectChartKind(ma, mb, mc ?? null);

    type ScatterRow = { assessmentId: string; x: number; y: number; z?: number };
    const payload: Record<string, unknown> = {
      chartKind,
      metricA: { id: ma.id, label: ma.label, shortLabel: ma.shortLabel },
      metricB: { id: mb.id, label: mb.label, shortLabel: mb.shortLabel },
      metricC: mc ? { id: mc.id, label: mc.label, shortLabel: mc.shortLabel } : undefined,
      nRows: rows.length,
      stats: {} as Record<string, number | null | undefined | object>,
      insight: "",
    };

    if (chartKind === "bubble_3d" && mc) {
      const scatter: ScatterRow[] = [];
      for (const r of rows) {
        const va = extractComparisonMetric(r, ma.id);
        const vb = extractComparisonMetric(r, mb.id);
        const vc = extractComparisonMetric(r, mc.id);
        if (va?.kind === "number" && vb?.kind === "number" && vc?.kind === "number") {
          scatter.push({ assessmentId: r.id, x: va.value, y: vb.value, z: vc.value });
        }
      }
      const xs = scatter.map((p) => p.x);
      const ys = scatter.map((p) => p.y);
      const rAb = correlationCoefficient(xs, ys);
      const { pValue } = pearsonSignificance(rAb, scatter.length);
      payload.scatter = scatter;
      payload.stats = {
        pearsonR: rAb,
        pearsonP: pValue,
        nPoints: scatter.length,
      };
      payload.insight = buildInsightSummary({
        chartKind,
        n: scatter.length,
        pearsonR: rAb,
        pValue,
        labelA: ma.shortLabel,
        labelB: mb.shortLabel,
      });
      await this.cache.set(key, payload, 30_000);
      return payload;
    }

    if (chartKind === "line_trend") {
      const timeMetric = ma.isTimeIndex ? ma : mb;
      const valueMetric = ma.isTimeIndex ? mb : ma;
      const map = new Map<string, number[]>();
      for (const r of rows) {
        const vt = extractComparisonMetric(r, timeMetric.id);
        const vv = extractComparisonMetric(r, valueMetric.id);
        if (vt?.kind === "string" && vv?.kind === "number") {
          const arr = map.get(vt.value) ?? [];
          arr.push(vv.value);
          map.set(vt.value, arr);
        }
      }
      const lineSeries = [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, vals]) => ({
          period,
          yMean: vals.reduce((s, v) => s + v, 0) / vals.length,
          n: vals.length,
        }));
      let pearsonR: number | null = null;
      let pearsonP: number | null = null;
      if (lineSeries.length >= 3) {
        const xs = lineSeries.map((_, i) => i);
        const ys = lineSeries.map((l) => l.yMean);
        pearsonR = correlationCoefficient(xs, ys);
        const sig = pearsonSignificance(pearsonR, lineSeries.length);
        pearsonP = sig.pValue;
      }
      payload.lineSeries = lineSeries;
      payload.stats = { pearsonR, pearsonP, nPeriods: lineSeries.length };
      payload.insight = buildInsightSummary({
        chartKind,
        n: rows.length,
        pearsonR,
        pValue: pearsonP,
        labelA: timeMetric.shortLabel,
        labelB: valueMetric.shortLabel,
      });
      await this.cache.set(key, payload, 30_000);
      return payload;
    }

    if (chartKind === "bar_groups") {
      const catRows: Array<{ category: string; value: number }> = [];
      for (const r of rows) {
        const va = extractComparisonMetric(r, ma.id);
        const vb = extractComparisonMetric(r, mb.id);
        if (ma.dataType === "categorical" && va?.kind === "string" && vb?.kind === "number") {
          catRows.push({ category: va.value, value: vb.value });
        } else if (mb.dataType === "categorical" && vb?.kind === "string" && va?.kind === "number") {
          catRows.push({ category: vb.value, value: va.value });
        }
      }
      const barGroups = groupNumericByCategory(catRows);
      const anovaP = anovaPValue(barGroups);
      payload.barGroups = barGroups;
      payload.stats = { anovaP, nPoints: catRows.length };
      payload.insight = buildInsightSummary({
        chartKind,
        n: catRows.length,
        anovaP,
        labelA: ma.shortLabel,
        labelB: mb.shortLabel,
      });
      await this.cache.set(key, payload, 30_000);
      return payload;
    }

    if (chartKind === "contingency_heatmap") {
      const catPairs: Array<{ a: string; b: string }> = [];
      for (const r of rows) {
        const va = extractComparisonMetric(r, ma.id);
        const vb = extractComparisonMetric(r, mb.id);
        if (va?.kind === "string" && vb?.kind === "string") {
          catPairs.push({ a: va.value, b: vb.value });
        }
      }
      const chi = chiSquareContingency(catPairs);
      payload.contingency = chi
        ? { aKeys: chi.aKeys, bKeys: chi.bKeys, counts: chi.counts, chi2: chi.chi2, df: chi.df, pValue: chi.pValue }
        : null;
      payload.stats = { chi2: chi?.chi2 ?? null, chi2P: chi?.pValue ?? null, chi2Df: chi?.df ?? null };
      payload.insight = buildInsightSummary({
        chartKind,
        n: catPairs.length,
        chi2P: chi?.pValue ?? null,
        labelA: ma.shortLabel,
        labelB: mb.shortLabel,
      });
      await this.cache.set(key, payload, 30_000);
      return payload;
    }

    /** scatter_regression default */
    const scatter: ScatterRow[] = [];
    for (const r of rows) {
      const va = extractComparisonMetric(r, ma.id);
      const vb = extractComparisonMetric(r, mb.id);
      if (va?.kind === "number" && vb?.kind === "number") {
        scatter.push({ assessmentId: r.id, x: va.value, y: vb.value });
      }
    }
    const xs = scatter.map((p) => p.x);
    const ys = scatter.map((p) => p.y);
    const pearsonR = correlationCoefficient(xs, ys);
    const { pValue } = pearsonSignificance(pearsonR, scatter.length);
    const regression = leastSquaresRegression(scatter.map((p) => ({ assessmentId: p.assessmentId, x: p.x, y: p.y })));
    payload.scatter = scatter;
    payload.stats = {
      pearsonR,
      pearsonP: pValue,
      regression,
      nPoints: scatter.length,
    };
    payload.insight = buildInsightSummary({
      chartKind,
      n: scatter.length,
      pearsonR,
      pValue,
      labelA: ma.shortLabel,
      labelB: mb.shortLabel,
    });
    await this.cache.set(key, payload, 30_000);
    return payload;
  }
}
