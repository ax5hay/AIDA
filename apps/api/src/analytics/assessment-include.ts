import { Prisma } from "@aida/db";

/** Full graph for analytics — DB → engine; never expose raw Prisma to UI beyond DTO shape */
export const ASSESSMENT_ANALYTICS_INCLUDE = {
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

export type FacilityAssessmentAnalytics = Prisma.ChcAssessmentGetPayload<{
  include: typeof ASSESSMENT_ANALYTICS_INCLUDE;
}>;
