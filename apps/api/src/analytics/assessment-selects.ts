import type { Prisma } from "@aida/db";

/**
 * Narrow selects — avoid loading remarks/documents/unused relations for hot paths.
 * Full graph remains on `assessmentDetail` via CHC_ASSESSMENT_ANALYTICS_INCLUDE.
 */

/** Overview KPIs + validation — no facility join, no remarks/documents/highRisk/infants/postnatal */
export const CHC_ASSESSMENT_OVERVIEW_SELECT = {
  id: true,
  periodStart: true,
  preconceptionWomenIdentified: true,
  preconceptionInterventions: true,
  preconceptionWomenManaged: true,
  pregnantWomenRegisteredAndScreened: true,
  pregnantWomenIdentified: true,
  pregnantWomenManaged: true,
  deliveryAndOutcomes: true,
} satisfies Prisma.ChcAssessmentSelect;

export type ChcAssessmentOverviewRow = Prisma.ChcAssessmentGetPayload<{
  select: typeof CHC_ASSESSMENT_OVERVIEW_SELECT;
}>;

/** One section per request — only the relation needed for totals + monthly buckets */
export const CHC_SECTION_SELECTS: Record<string, Prisma.ChcAssessmentSelect> = {
  preconception_women_identified: {
    id: true,
    periodStart: true,
    preconceptionWomenIdentified: true,
  },
  preconception_interventions: {
    id: true,
    periodStart: true,
    preconceptionInterventions: true,
  },
  preconception_women_managed: {
    id: true,
    periodStart: true,
    preconceptionWomenManaged: true,
  },
  pregnant_women_registered_and_screened: {
    id: true,
    periodStart: true,
    pregnantWomenRegisteredAndScreened: true,
  },
  pregnant_women_identified: {
    id: true,
    periodStart: true,
    pregnantWomenIdentified: true,
  },
  pregnant_women_managed: {
    id: true,
    periodStart: true,
    pregnantWomenManaged: true,
  },
  high_risk_pregnancy: {
    id: true,
    periodStart: true,
    highRiskPregnancy: true,
  },
  delivery_and_outcomes: {
    id: true,
    periodStart: true,
    deliveryAndOutcomes: true,
  },
  infants_0_to_24_months: {
    id: true,
    periodStart: true,
    infants0To24Months: true,
  },
  postnatal_women: {
    id: true,
    periodStart: true,
    postnatalWomen: true,
  },
};

export const CHC_CORRELATIONS_SELECT = {
  id: true,
  preconceptionWomenIdentified: {
    select: {
      severe_anemia_hb_lt_8: true,
      moderate_anemia_hb_8_to_11_99: true,
      bmi_lt_16: true,
      bmi_16_to_18_49: true,
      bmi_18_5_to_lt_21: true,
    },
  },
  pregnantWomenIdentified: {
    select: {
      severe_anemia_hb_lt_7: true,
      moderate_anemia_hb_7_to_9_9: true,
      bmi_lt_18_5: true,
      bmi_lt_25: true,
    },
  },
  deliveryAndOutcomes: { select: { live_births: true } },
} satisfies Prisma.ChcAssessmentSelect;

export type ChcAssessmentCorrelationsRow = Prisma.ChcAssessmentGetPayload<{
  select: typeof CHC_CORRELATIONS_SELECT;
}>;

export const CHC_ANOMALIES_SELECT = {
  id: true,
  deliveryAndOutcomes: {
    select: {
      live_births: true,
      maternal_deaths: true,
    },
  },
  facility: { select: { name: true } },
} satisfies Prisma.ChcAssessmentSelect;

export const CHC_EXPLORER_SELECT = {
  id: true,
  facilityId: true,
  periodStart: true,
  periodEnd: true,
  facility: { select: { id: true, name: true, district: true, state: true } },
  remarks: {
    select: {
      observational_remarks: true,
      respondent_remarks: true,
    },
  },
  documents: {
    select: {
      document_1: true,
      document_2: true,
      document_3: true,
      document_4: true,
      document_5: true,
      document_6: true,
    },
  },
  pregnantWomenRegisteredAndScreened: { select: { total_anc_registered: true } },
  deliveryAndOutcomes: { select: { live_births: true, maternal_deaths: true } },
} satisfies Prisma.ChcAssessmentSelect;

export type ChcAssessmentExplorerRow = Prisma.ChcAssessmentGetPayload<{
  select: typeof CHC_EXPLORER_SELECT;
}>;

/** Full analytic graph for public health intelligence (pipelines, gaps, cohorts, links) */
export const CHC_INTELLIGENCE_SELECT = {
  id: true,
  periodStart: true,
  facility: { select: { district: true, state: true, name: true } },
  preconceptionWomenIdentified: true,
  preconceptionInterventions: true,
  preconceptionWomenManaged: true,
  pregnantWomenRegisteredAndScreened: true,
  pregnantWomenIdentified: true,
  pregnantWomenManaged: true,
  highRiskPregnancy: true,
  deliveryAndOutcomes: true,
  infants0To24Months: true,
  postnatalWomen: true,
} satisfies Prisma.ChcAssessmentSelect;

export type ChcAssessmentIntelligenceRow = Prisma.ChcAssessmentGetPayload<{
  select: typeof CHC_INTELLIGENCE_SELECT;
}>;
