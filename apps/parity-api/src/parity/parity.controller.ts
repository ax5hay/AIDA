import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ParityService, type SubmissionFilters } from "./parity.service";
import { parseIsoDate } from "./submission-date-range";

function normalizeDateRangeQuery(from?: string, to?: string): { from?: string; to?: string } {
  const f = from?.trim() || undefined;
  const t = to?.trim() || undefined;
  if (f && !parseIsoDate(f)) {
    throw new BadRequestException("Query 'from' must be a valid date in YYYY-MM-DD form.");
  }
  if (t && !parseIsoDate(t)) {
    throw new BadRequestException("Query 'to' must be a valid date in YYYY-MM-DD form.");
  }
  const pf = f ? parseIsoDate(f)! : undefined;
  const pt = t ? parseIsoDate(t)! : undefined;
  if (pf && pt) {
    const df = new Date(pf.y, pf.m - 1, pf.d);
    const dt = new Date(pt.y, pt.m - 1, pt.d);
    if (df > dt) {
      throw new BadRequestException("Query 'from' must be on or before 'to'.");
    }
  }
  return { from: f, to: t };
}

@Controller("parity")
export class ParityController {
  constructor(private readonly parity: ParityService) {}

  @Get("health")
  health() {
    return { ok: true, service: "parity" };
  }

  @Get("taxonomy/districts")
  listDistricts() {
    return this.parity.listDistricts();
  }

  @Post("taxonomy/districts")
  addDistrict(@Body() body: { name: string }) {
    if (!body?.name?.trim()) throw new BadRequestException("name required");
    return this.parity.addDistrict(body.name);
  }

  @Get("taxonomy/blocks")
  listBlocks(@Query("districtId") districtId?: string) {
    return this.parity.listBlocks(districtId);
  }

  @Post("taxonomy/blocks")
  addBlock(@Body() body: { districtId: string; name: string }) {
    if (!body?.districtId || !body?.name?.trim()) throw new BadRequestException("districtId and name required");
    return this.parity.addBlock(body.districtId, body.name);
  }

  @Get("taxonomy/regions")
  listRegions(@Query("blockId") blockId?: string) {
    return this.parity.listRegions(blockId);
  }

  @Post("taxonomy/regions")
  addRegion(@Body() body: { blockId: string; name: string }) {
    if (!body?.blockId || !body?.name?.trim()) throw new BadRequestException("blockId and name required");
    return this.parity.addRegion(body.blockId, body.name);
  }

  @Get("taxonomy/facilities")
  listFacilities(@Query("regionId") regionId?: string) {
    return this.parity.listFacilities(regionId);
  }

  @Post("taxonomy/facilities")
  addFacility(@Body() body: { regionId: string; facilityTypeId: string; name: string }) {
    if (!body?.regionId || !body?.facilityTypeId || !body?.name?.trim()) {
      throw new BadRequestException("regionId, facilityTypeId, and name required");
    }
    return this.parity.addFacility(body.regionId, body.facilityTypeId, body.name);
  }

  @Get("taxonomy/facility-types")
  listFacilityTypes() {
    return this.parity.listFacilityTypes();
  }

  @Post("taxonomy/facility-types")
  addFacilityType(@Body() body: { code: string; label: string }) {
    if (!body?.code?.trim() || !body?.label?.trim()) throw new BadRequestException("code and label required");
    return this.parity.addFacilityType(body.code, body.label);
  }

  @Post("submissions")
  createSubmission(@Body() body: unknown) {
    return this.parity.createSubmission(body);
  }

  @Get("submissions/:id")
  getSubmission(@Param("id") id: string) {
    return this.parity.getSubmissionById(id);
  }

  @Get("submissions")
  async listSubmissions(
    @Query("districtId") districtId?: string,
    @Query("blockId") blockId?: string,
    @Query("regionId") regionId?: string,
    @Query("facilityId") facilityId?: string,
    @Query("facilityTypeId") facilityTypeId?: string,
    @Query("periodYear") periodYear?: string,
    @Query("periodMonth") periodMonth?: string,
    @Query("periodDay") periodDay?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const { from: fromD, to: toD } = normalizeDateRangeQuery(from, to);
    const filters: SubmissionFilters = {};
    if (districtId) filters.districtId = districtId;
    if (blockId) filters.blockId = blockId;
    if (regionId) filters.regionId = regionId;
    if (facilityId) filters.facilityId = facilityId;
    if (facilityTypeId) filters.facilityTypeId = facilityTypeId;
    if (periodYear != null && periodYear !== "") filters.periodYear = Number(periodYear);
    if (periodMonth != null && periodMonth !== "") filters.periodMonth = Number(periodMonth);
    if (periodDay != null && periodDay !== "") filters.periodDay = Number(periodDay);
    if (fromD) filters.from = fromD;
    if (toD) filters.to = toD;

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 25));
    const skip = (p - 1) * ps;

    const [totalCount, rows] = await Promise.all([
      this.parity.countSubmissions(filters),
      this.parity.listSubmissions({ ...filters, skip, take: ps }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / ps));
    return {
      meta: {
        page: p,
        pageSize: ps,
        totalCount,
        totalPages,
        hasMore: p < totalPages,
      },
      rows,
    };
  }

  @Get("analytics")
  analytics(
    @Query("districtId") districtId?: string,
    @Query("blockId") blockId?: string,
    @Query("regionId") regionId?: string,
    @Query("facilityId") facilityId?: string,
    @Query("facilityTypeId") facilityTypeId?: string,
    @Query("periodYear") periodYear?: string,
    @Query("periodMonth") periodMonth?: string,
    @Query("periodDay") periodDay?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const { from: fromD, to: toD } = normalizeDateRangeQuery(from, to);
    const filters: SubmissionFilters = {};
    if (districtId) filters.districtId = districtId;
    if (blockId) filters.blockId = blockId;
    if (regionId) filters.regionId = regionId;
    if (facilityId) filters.facilityId = facilityId;
    if (facilityTypeId) filters.facilityTypeId = facilityTypeId;
    if (periodYear != null && periodYear !== "") filters.periodYear = Number(periodYear);
    if (periodMonth != null && periodMonth !== "") filters.periodMonth = Number(periodMonth);
    if (periodDay != null && periodDay !== "") filters.periodDay = Number(periodDay);
    if (fromD) filters.from = fromD;
    if (toD) filters.to = toD;
    return this.parity.analytics(filters);
  }
}
