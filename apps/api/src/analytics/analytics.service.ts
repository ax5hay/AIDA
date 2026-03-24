import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
  fieldMetrics,
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
  type ValidationIssue,
} from "@aida/analytics-engine";
import { correlationMatrix, detectAnomalies, type AnomalyFlag } from "@aida/ml-engine";
import { PrismaService } from "../prisma/prisma.service";
import {
  CHC_ASSESSMENT_ANALYTICS_INCLUDE,
  type ChcAssessmentAnalytics,
} from "./assessment-include";

/** Prisma nested rows include id/assessmentId; analytics helpers expect numeric field maps. */
function asNumericRecord(obj: object | null | undefined): Record<string, number> | undefined {
  if (obj == null) return undefined;
  return obj as unknown as Record<string, number>;
}

export type ExplorerFilters = {
  from?: string;
  to?: string;
  district?: string;
  facilityId?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private cacheKey(prefix: string, f: ExplorerFilters): string {
    return `${prefix}:${f.from ?? ""}:${f.to ?? ""}:${f.district ?? ""}:${f.facilityId ?? ""}`;
  }

  private whereClause(f: ExplorerFilters): Prisma.ChcAssessmentWhereInput {
    const period: Prisma.DateTimeFilter = {};
    if (f.from) period.gte = new Date(f.from);
    if (f.to) period.lte = new Date(f.to);
    const where: Prisma.ChcAssessmentWhereInput = {};
    if (f.from || f.to) where.periodStart = period;
    if (f.facilityId) where.facilityId = f.facilityId;
    if (f.district) where.facility = { is: { district: f.district } };
    return where;
  }

  async loadAssessments(f: ExplorerFilters): Promise<ChcAssessmentAnalytics[]> {
    return this.prisma.chcAssessment.findMany({
      where: this.whereClause(f),
      include: CHC_ASSESSMENT_ANALYTICS_INCLUDE,
      orderBy: { periodStart: "asc" },
    });
  }

  async overview(f: ExplorerFilters) {
    const key = this.cacheKey("overview", f);
    const hit = await this.cache.get(key);
    if (hit) return hit;

    const rows = await this.loadAssessments(f);

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

    const payload = {
      meta: {
        assessmentCount: rows.length,
        filters: f,
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
    const rows = await this.loadAssessments(f);

    const pickers: Record<
      string,
      (r: ChcAssessmentAnalytics) => Record<string, number> | null | undefined
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

    const flat = rows.map((r) => pick(r)).filter((x): x is Record<string, number> => x !== null && x !== undefined);
    const totals = sumFields(flat, fieldList as unknown as string[]);
    const denom =
      section === "pregnant_women_registered_and_screened"
        ? totals["total_anc_registered" as keyof typeof totals]
        : null;

    const metrics = fieldMetrics(totals as Record<string, number>, fieldList as unknown as string[], denom);
    const distribution = distributionShares(totals as Record<string, number>, fieldList as unknown as string[]);

    const buckets = this.monthBuckets(rows, (r) => pick(r) ?? null);
    const timeSeries = (fieldList as readonly string[]).map((field) => ({
      field,
      points: buildTimeSeries(
        buckets.map((b) => ({ periodStart: b.periodStart, rows: b.rows })),
        field,
        (i: number) => {
          if (section !== "pregnant_women_registered_and_screened") return null;
          const b = buckets[i];
          const t = sumFields(b.rows, PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS as unknown as string[]);
          return t.total_anc_registered;
        },
      ),
    }));

    const comparativeDistribution = distribution;

    return {
      section,
      totals,
      fieldMetrics: metrics,
      comparativeDistribution,
      timeSeries,
    };
  }

  async correlations(f: ExplorerFilters) {
    const rows = await this.loadAssessments(f);
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

    return {
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
      matrix: correlationMatrix({
        anemia_pre: anemiaPre,
        bmi_pre: bmiPre,
        anemia_preg: anemiaPreg,
        bmi_preg: bmiPreg,
        live_births: rows.map((r) => r.deliveryAndOutcomes?.live_births ?? 0),
      }),
    };
  }

  async anomalies(metric: "live_births" | "maternal_deaths", f: ExplorerFilters) {
    const rows = await this.loadAssessments(f);
    const values = rows.map((r) => {
      const d = r.deliveryAndOutcomes;
      if (!d) return 0;
      return metric === "live_births" ? d.live_births : d.maternal_deaths;
    });
    const thresholdZ = 2.5;
    const flags = detectAnomalies(values, thresholdZ);
    return {
      metric,
      thresholdZ,
      points: flags.map((x: AnomalyFlag) => ({
        ...x,
        assessmentId: rows[x.index]?.id,
        facility: rows[x.index]?.facility?.name,
      })),
    };
  }

  async explorer(f: ExplorerFilters) {
    const rows = await this.loadAssessments(f);
    return {
      meta: {
        totalCount: rows.length,
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
      include: CHC_ASSESSMENT_ANALYTICS_INCLUDE,
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
    const rows = await this.prisma.chcAssessment.findMany({
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
    return [...map.values()].sort((a, b) => b.assessments - a.assessments);
  }

  /**
   * Per-assessment pairs for scatter plots where both axes come from the same reporting row
   * (or clearly paired sections), so comparisons are interpretable.
   */
  async clinicalCrossSection(f: ExplorerFilters) {
    const rows = await this.prisma.chcAssessment.findMany({
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

    return {
      ancHgb,
      ancHiv,
      pregAnemiaVsLive,
      preconceptionAnemiaIdVsManaged,
    };
  }
}
