import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@aida/db";
import {
  PARITY_INT_KEYS,
  ParityCreateBodySchema,
  buildParityAnalytics,
  validateParityBusinessRules,
  type ParityCreateBody,
  type ParitySubmissionRow,
} from "@aida/parity-core";
import { PrismaService } from "../prisma/prisma.service";
import { paritySubmissionDateRangeWhere } from "./submission-date-range";

const submissionInclude = {
  district: true,
  block: true,
  region: true,
  facility: { include: { facilityType: true } },
} as const;

type SubmissionEntity = Prisma.ParityAncSubmissionGetPayload<{ include: typeof submissionInclude }>;

function toRow(s: SubmissionEntity): ParitySubmissionRow {
  const row: ParitySubmissionRow = {
    id: s.id,
    districtId: s.districtId,
    districtName: s.district.name,
    blockId: s.blockId,
    blockName: s.block.name,
    regionId: s.regionId,
    regionName: s.region.name,
    facilityId: s.facilityId,
    facilityName: s.facility.name,
    facilityTypeId: s.facility.facilityTypeId,
    facilityTypeCode: s.facility.facilityType.code,
    periodYear: s.periodYear,
    periodMonth: s.periodMonth,
    periodDay: s.periodDay,
    remarks: s.remarks,
    createdAt: s.createdAt.toISOString(),
  };
  for (const k of PARITY_INT_KEYS) {
    row[k] = s[k];
  }
  return row;
}

function intPayload(
  body: ParityCreateBody,
  denorm: { districtId: string; blockId: string; regionId: string },
): Prisma.ParityAncSubmissionUncheckedCreateInput {
  const data: Prisma.ParityAncSubmissionUncheckedCreateInput = {
    facilityId: body.facilityId,
    districtId: denorm.districtId,
    blockId: denorm.blockId,
    regionId: denorm.regionId,
    periodYear: body.periodYear,
    periodMonth: body.periodMonth,
    periodDay: body.periodDay,
    remarks: body.remarks ?? null,
  };
  for (const k of PARITY_INT_KEYS) {
    const v = body[k];
    data[k] = v === undefined ? null : v;
  }
  return data;
}

export type SubmissionFilters = {
  districtId?: string;
  blockId?: string;
  regionId?: string;
  facilityId?: string;
  facilityTypeId?: string;
  periodYear?: number;
  periodMonth?: number;
  periodDay?: number;
  /** Inclusive lower bound, ISO `YYYY-MM-DD` (reporting day or month overlap). */
  from?: string;
  /** Inclusive upper bound, ISO `YYYY-MM-DD`. */
  to?: string;
};

@Injectable()
export class ParityService {
  constructor(private readonly prisma: PrismaService) {}

  private submissionWhere(filters: SubmissionFilters): Prisma.ParityAncSubmissionWhereInput {
    const parts: Prisma.ParityAncSubmissionWhereInput[] = [];
    if (filters.districtId) parts.push({ districtId: filters.districtId });
    if (filters.blockId) parts.push({ blockId: filters.blockId });
    if (filters.regionId) parts.push({ regionId: filters.regionId });
    if (filters.facilityId) parts.push({ facilityId: filters.facilityId });
    if (filters.facilityTypeId) parts.push({ facility: { facilityTypeId: filters.facilityTypeId } });
    if (filters.periodYear != null) parts.push({ periodYear: filters.periodYear });
    if (filters.periodMonth != null) parts.push({ periodMonth: filters.periodMonth });
    if (filters.periodDay != null) parts.push({ periodDay: filters.periodDay });
    const dr = paritySubmissionDateRangeWhere(filters.from, filters.to);
    if (dr) parts.push(dr);
    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0]!;
    return { AND: parts };
  }

  async createSubmission(body: unknown) {
    const parsed = ParityCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const business = validateParityBusinessRules(parsed.data);
    const hard = business.filter((b) => b.severity === "error");
    if (hard.length) {
      throw new BadRequestException({ code: "BUSINESS_RULE", issues: hard });
    }

    const fac = await this.prisma.parityFacility.findUnique({
      where: { id: parsed.data.facilityId },
      include: { region: { include: { block: { include: { district: true } } } }, facilityType: true },
    });
    if (!fac) throw new BadRequestException("That facility could not be found.");
    const denorm = {
      districtId: fac.region.block.districtId,
      blockId: fac.region.blockId,
      regionId: fac.regionId,
    };

    const day = parsed.data.periodDay;
    if (day === 0) {
      const dailyConflict = await this.prisma.parityAncSubmission.findFirst({
        where: {
          facilityId: parsed.data.facilityId,
          periodYear: parsed.data.periodYear,
          periodMonth: parsed.data.periodMonth,
          periodDay: { gt: 0 },
        },
      });
      if (dailyConflict) {
        throw new BadRequestException(
          "This facility already has daily returns for this month. Remove daily rows before filing a whole-month return, or use daily entry only.",
        );
      }
    } else {
      const monthlyConflict = await this.prisma.parityAncSubmission.findFirst({
        where: {
          facilityId: parsed.data.facilityId,
          periodYear: parsed.data.periodYear,
          periodMonth: parsed.data.periodMonth,
          periodDay: 0,
        },
      });
      if (monthlyConflict) {
        throw new BadRequestException(
          "A whole-month return already exists for this facility and month. Use daily entry only for this month, or delete the monthly row first.",
        );
      }
    }

    try {
      const created = await this.prisma.parityAncSubmission.create({
        data: intPayload(parsed.data, denorm),
        include: submissionInclude,
      });
      const row = toRow(created);
      return {
        submission: row,
        warnings: business.filter((b) => b.severity === "warning"),
        analytics: buildParityAnalytics(await this.loadRowsForAnalytics({})),
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(
          "A submission already exists for this facility and reporting period (same month and day mode).",
        );
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new BadRequestException("Invalid facility or taxonomy reference.");
      }
      throw e;
    }
  }

  async getSubmissionById(id: string) {
    const s = await this.prisma.parityAncSubmission.findUnique({
      where: { id },
      include: submissionInclude,
    });
    if (!s) throw new NotFoundException("That monthly return could not be found.");
    return toRow(s);
  }

  async listSubmissions(filters: SubmissionFilters & { skip?: number; take?: number }) {
    const where = this.submissionWhere(filters);

    const rows = await this.prisma.parityAncSubmission.findMany({
      where,
      include: submissionInclude,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { periodDay: "desc" }, { createdAt: "desc" }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 500,
    });
    return rows.map(toRow);
  }

  async countSubmissions(filters: SubmissionFilters) {
    const where = this.submissionWhere(filters);
    return this.prisma.parityAncSubmission.count({ where });
  }

  async analytics(filters: SubmissionFilters) {
    const rows = await this.loadRowsForAnalytics(filters);
    return buildParityAnalytics(rows);
  }

  private async loadRowsForAnalytics(filters: SubmissionFilters): Promise<ParitySubmissionRow[]> {
    const where = this.submissionWhere(filters);

    const rows = await this.prisma.parityAncSubmission.findMany({
      where,
      include: submissionInclude,
    });
    return rows.map(toRow);
  }

  // --- Taxonomy ---

  listDistricts() {
    return this.prisma.parityDistrict.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async addDistrict(name: string) {
    return this.prisma.parityDistrict.create({
      data: { name: name.trim() },
    });
  }

  listBlocks(districtId?: string) {
    return this.prisma.parityBlock.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { district: true },
    });
  }

  async addBlock(districtId: string, name: string) {
    const d = await this.prisma.parityDistrict.findUnique({ where: { id: districtId } });
    if (!d) throw new NotFoundException("District not found");
    return this.prisma.parityBlock.create({
      data: { districtId, name: name.trim() },
    });
  }

  listRegions(blockId?: string) {
    return this.prisma.parityRegion.findMany({
      where: blockId ? { blockId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { block: { include: { district: true } } },
    });
  }

  async addRegion(blockId: string, name: string) {
    const b = await this.prisma.parityBlock.findUnique({ where: { id: blockId } });
    if (!b) throw new NotFoundException("Block not found");
    return this.prisma.parityRegion.create({
      data: { blockId, name: name.trim() },
    });
  }

  listFacilities(regionId?: string) {
    return this.prisma.parityFacility.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { region: { include: { block: true } }, facilityType: true },
    });
  }

  async addFacility(regionId: string, facilityTypeId: string, name: string) {
    const r = await this.prisma.parityRegion.findUnique({ where: { id: regionId } });
    if (!r) throw new NotFoundException("Region not found");
    const ft = await this.prisma.parityFacilityType.findUnique({ where: { id: facilityTypeId } });
    if (!ft) throw new NotFoundException("Facility type not found");
    return this.prisma.parityFacility.create({
      data: {
        regionId,
        facilityTypeId,
        name: name.trim(),
      },
    });
  }

  listFacilityTypes() {
    return this.prisma.parityFacilityType.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
  }

  async addFacilityType(code: string, label: string) {
    return this.prisma.parityFacilityType.create({
      data: { code: code.trim().toUpperCase(), label: label.trim() },
    });
  }
}
