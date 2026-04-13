import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import type { ExplorerFilters } from "./analytics-filters";
import { parseExplorerFilters } from "./analytics-filters";
import { AnalyticsService } from "./analytics.service";
import { RateLimit } from "../common/rate-limit.decorator";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private filters(
    from?: string,
    to?: string,
    district?: string,
    facilityId?: string,
  ): ExplorerFilters {
    try {
      return parseExplorerFilters(from, to, district, facilityId);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid filters");
    }
  }

  @Get("overview")
  overview(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.overview(this.filters(from, to, district, facilityId));
  }

  @Get("section/:section")
  section(
    @Param("section") section: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.section(section, this.filters(from, to, district, facilityId));
  }

  @Get("district-rollup")
  districtRollup(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.districtRollup(this.filters(from, to, district, facilityId));
  }

  @Get("clinical-cross-section")
  clinicalCrossSection(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.clinicalCrossSection(this.filters(from, to, district, facilityId));
  }

  @Get("intelligence")
  @RateLimit(30, 60_000)
  intelligence(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.intelligence(this.filters(from, to, district, facilityId));
  }

  @Get("decision-support")
  @RateLimit(40, 60_000)
  decisionSupport(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.decisionSupport(this.filters(from, to, district, facilityId));
  }

  @Get("comparison-lab/catalog")
  comparisonLabCatalog() {
    return this.analytics.comparisonLabCatalog();
  }

  @Get("comparison-lab/run")
  @RateLimit(30, 60_000)
  comparisonLabRun(
    @Query("metricA") metricA?: string,
    @Query("metricB") metricB?: string,
    @Query("metricC") metricC?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    if (!metricA || !metricB) {
      throw new BadRequestException("metricA and metricB are required.");
    }
    return this.analytics.comparisonLabRun(metricA, metricB, this.filters(from, to, district, facilityId), metricC);
  }

  @Get("correlations")
  correlations(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.correlations(this.filters(from, to, district, facilityId));
  }

  @Get("anomalies")
  @RateLimit(40, 60_000)
  anomalies(
    @Query("metric") metric?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const m: "live_births" | "maternal_deaths" =
      metric === "maternal_deaths" ? "maternal_deaths" : "live_births";
    const p = Math.max(1, Number(page ?? 1) || 1);
    const s = Math.min(200, Math.max(1, Number(pageSize ?? 25) || 25));
    return this.analytics.anomalies(m, this.filters(from, to, district, facilityId), p, s);
  }

  @Get("explorer")
  @RateLimit(40, 60_000)
  explorer(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const p = Number(page ?? 1);
    const s = Number(pageSize ?? 200);
    return this.analytics.explorer(this.filters(from, to, district, facilityId), p, s);
  }

  @Get("assessments/:id")
  assessmentDetail(@Param("id") id: string) {
    return this.analytics.assessmentDetail(id);
  }
}
