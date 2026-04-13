import { BadRequestException, Injectable } from "@nestjs/common";
import {
  validateManagedVsIdentified,
  validateScreeningVsRegistered,
  type ValidationIssue,
} from "@aida/analytics-engine";
import { PrismaService } from "../prisma/prisma.service";
import { emptySections } from "./defaults";

type Scalar = number | string | null;

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function mergeSection<T extends Record<string, Scalar>>(
  base: T,
  patch: unknown,
  label: string,
): T {
  if (!patch) return { ...base };
  const input = ensureObject(patch, label);
  const out = { ...base };
  for (const [k, v] of Object.entries(input)) {
    if (!(k in base)) {
      throw new BadRequestException(`Unknown field in ${label}: ${k}`);
    }
    if (v === undefined) continue;
    const expected = typeof base[k as keyof T];
    if (expected === "number") {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        throw new BadRequestException(`Invalid non-negative number for ${label}.${k}`);
      }
      (out as Record<string, unknown>)[k] = v;
      continue;
    }
    if (expected === "string") {
      if (typeof v !== "string") {
        throw new BadRequestException(`Invalid string for ${label}.${k}`);
      }
      (out as Record<string, unknown>)[k] = v;
      continue;
    }
    if (v !== null && typeof v !== "string") {
      throw new BadRequestException(`Invalid string/null for ${label}.${k}`);
    }
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function validateTopLevelPayload(body: IngestAssessmentBody): void {
  const required = ["facilityId", "periodStart", "periodEnd"] as const;
  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string") {
      throw new BadRequestException(`${field} required`);
    }
  }
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

export type IngestionSchemaField = {
  key: string;
  type: "number" | "text";
  defaultValue: number | string | null;
};

export type IngestionSchemaSection = {
  key: keyof typeof emptySections;
  label: string;
  fields: IngestionSchemaField[];
};

@Injectable()
export class IngestionService {
  constructor(private readonly prisma: PrismaService) {}

  private sectionLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  getSchema(): { sections: IngestionSchemaSection[] } {
    const sections = (Object.entries(emptySections) as Array<[keyof typeof emptySections, Record<string, Scalar>]>).map(
      ([sectionKey, defaults]) => ({
        key: sectionKey,
        label: this.sectionLabel(sectionKey),
        fields: Object.entries(defaults).map(([fieldKey, defaultValue]) => ({
          key: fieldKey,
          type: (typeof defaultValue === "number" ? "number" : "text") as "number" | "text",
          defaultValue,
        })),
      }),
    );
    return { sections };
  }

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
    validateTopLevelPayload(body);
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

    const existing = await this.prisma.chcAssessment.findFirst({
      where: { facilityId: body.facilityId, periodStart, periodEnd },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Assessment already exists for facility and period window (id: ${existing.id})`,
      );
    }

    const pci = mergeSection(
      emptySections.preconceptionWomenIdentified,
      body.preconceptionWomenIdentified,
      "preconceptionWomenIdentified",
    );
    const pint = mergeSection(
      emptySections.preconceptionInterventions,
      body.preconceptionInterventions,
      "preconceptionInterventions",
    );
    const pcm = mergeSection(
      emptySections.preconceptionWomenManaged,
      body.preconceptionWomenManaged,
      "preconceptionWomenManaged",
    );
    const pwr = mergeSection(
      emptySections.pregnantWomenRegisteredAndScreened,
      body.pregnantWomenRegisteredAndScreened,
      "pregnantWomenRegisteredAndScreened",
    );
    const pwi = mergeSection(
      emptySections.pregnantWomenIdentified,
      body.pregnantWomenIdentified,
      "pregnantWomenIdentified",
    );
    const pwm = mergeSection(
      emptySections.pregnantWomenManaged,
      body.pregnantWomenManaged,
      "pregnantWomenManaged",
    );
    const hr = mergeSection(emptySections.highRiskPregnancy, body.highRiskPregnancy, "highRiskPregnancy");
    const del = mergeSection(
      emptySections.deliveryAndOutcomes,
      body.deliveryAndOutcomes,
      "deliveryAndOutcomes",
    );
    const inf = mergeSection(emptySections.infants0To24Months, body.infants0To24Months, "infants0To24Months");
    const pn = mergeSection(emptySections.postnatalWomen, body.postnatalWomen, "postnatalWomen");
    const rem = mergeSection(emptySections.remarks, body.remarks, "remarks");
    const docs = mergeSection(emptySections.documents, body.documents, "documents");

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
        periodStart,
        periodEnd,
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
