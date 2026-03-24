import { Prisma } from "@aida/db";

/** Full graph for analytics — DB → engine; never expose raw Prisma to UI beyond DTO shape */
export const CHC_ASSESSMENT_ANALYTICS_INCLUDE = {
  facility: true,
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
  remarks: true,
  documents: true,
} satisfies Prisma.ChcAssessmentInclude;

export type ChcAssessmentAnalytics = Prisma.ChcAssessmentGetPayload<{
  include: typeof CHC_ASSESSMENT_ANALYTICS_INCLUDE;
}>;
