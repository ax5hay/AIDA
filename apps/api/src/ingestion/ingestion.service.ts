import { BadRequestException, Injectable } from "@nestjs/common";
import {
  validateManagedVsIdentified,
  validateScreeningVsRegistered,
  type ValidationIssue,
} from "@aida/analytics-engine";
import { PrismaService } from "../prisma/prisma.service";
import { emptySections } from "./defaults";

function mergeSection<T extends Record<string, number | string | null>>(
  base: T,
  patch: Partial<T> | undefined,
): T {
  if (!patch) return { ...base };
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "number" && v < 0) {
      throw new BadRequestException(`Negative count: ${k}`);
    }
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export type IngestAssessmentBody = {
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  preconceptionWomenIdentified?: Partial<typeof emptySections.preconceptionWomenIdentified>;
  preconceptionInterventions?: Partial<typeof emptySections.preconceptionInterventions>;
  preconceptionWomenManaged?: Partial<typeof emptySections.preconceptionWomenManaged>;
  pregnantWomenRegisteredAndScreened?: Partial<
    typeof emptySections.pregnantWomenRegisteredAndScreened
  >;
  pregnantWomenIdentified?: Partial<typeof emptySections.pregnantWomenIdentified>;
  pregnantWomenManaged?: Partial<typeof emptySections.pregnantWomenManaged>;
  highRiskPregnancy?: Partial<typeof emptySections.highRiskPregnancy>;
  deliveryAndOutcomes?: Partial<typeof emptySections.deliveryAndOutcomes>;
  infants0To24Months?: Partial<typeof emptySections.infants0To24Months>;
  postnatalWomen?: Partial<typeof emptySections.postnatalWomen>;
  remarks?: Partial<typeof emptySections.remarks>;
  documents?: Partial<typeof emptySections.documents>;
};

@Injectable()
export class IngestionService {
  constructor(private readonly prisma: PrismaService) {}

  private validateLogicalConsistency(
    pci: Record<string, number | string | null>,
    pcm: Record<string, number | string | null>,
    pwr: Record<string, number | string | null>,
    pwi: Record<string, number | string | null>,
    pwm: Record<string, number | string | null>,
  ): void {
    const issues: string[] = [];
    const { total_anc_registered, ...screened } = pwr;
    issues.push(
      ...validateScreeningVsRegistered(
        total_anc_registered as number,
        screened as Record<string, number>,
      ).map((i: ValidationIssue) => i.message),
    );
    issues.push(
      ...validateManagedVsIdentified(
        pci as Record<string, number>,
        pcm as Record<string, number>,
        "preconception",
      ).map((i: ValidationIssue) => i.message),
    );
    issues.push(
      ...validateManagedVsIdentified(
        pwi as Record<string, number>,
        pwm as Record<string, number>,
        "pregnancy",
      ).map((i: ValidationIssue) => i.message),
    );
    if (issues.length > 0) {
      throw new BadRequestException({ message: "Logical validation failed", issues });
    }
  }

  async createAssessment(body: IngestAssessmentBody) {
    if (!body.facilityId) throw new BadRequestException("facilityId required");
    if (!body.periodStart || !body.periodEnd) {
      throw new BadRequestException("periodStart and periodEnd are required");
    }
    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException("Invalid periodStart or periodEnd");
    }
    if (periodStart >= periodEnd) {
      throw new BadRequestException("periodStart must be strictly before periodEnd");
    }

    const facility = await this.prisma.facility.findUnique({ where: { id: body.facilityId } });
    if (!facility) throw new BadRequestException("facility not found");

    const pci = mergeSection(emptySections.preconceptionWomenIdentified, body.preconceptionWomenIdentified);
    const pint = mergeSection(emptySections.preconceptionInterventions, body.preconceptionInterventions);
    const pcm = mergeSection(emptySections.preconceptionWomenManaged, body.preconceptionWomenManaged);
    const pwr = mergeSection(
      emptySections.pregnantWomenRegisteredAndScreened,
      body.pregnantWomenRegisteredAndScreened,
    );
    const pwi = mergeSection(emptySections.pregnantWomenIdentified, body.pregnantWomenIdentified);
    const pwm = mergeSection(emptySections.pregnantWomenManaged, body.pregnantWomenManaged);
    const hr = mergeSection(emptySections.highRiskPregnancy, body.highRiskPregnancy);
    const del = mergeSection(emptySections.deliveryAndOutcomes, body.deliveryAndOutcomes);
    const inf = mergeSection(emptySections.infants0To24Months, body.infants0To24Months);
    const pn = mergeSection(emptySections.postnatalWomen, body.postnatalWomen);
    const rem = { ...emptySections.remarks, ...body.remarks };
    const docs = { ...emptySections.documents, ...body.documents };

    this.validateLogicalConsistency(
      pci as Record<string, number | string | null>,
      pcm as Record<string, number | string | null>,
      pwr as Record<string, number | string | null>,
      pwi as Record<string, number | string | null>,
      pwm as Record<string, number | string | null>,
    );

    return this.prisma.chcAssessment.create({
      data: {
        facilityId: body.facilityId,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        preconceptionWomenIdentified: { create: pci },
        preconceptionInterventions: { create: pint },
        preconceptionWomenManaged: { create: pcm },
        pregnantWomenRegisteredAndScreened: { create: pwr },
        pregnantWomenIdentified: { create: pwi },
        pregnantWomenManaged: { create: pwm },
        highRiskPregnancy: { create: hr },
        deliveryAndOutcomes: { create: del },
        infants0To24Months: { create: inf },
        postnatalWomen: { create: pn },
        remarks: { create: rem },
        documents: { create: docs },
      },
    });
  }
}
