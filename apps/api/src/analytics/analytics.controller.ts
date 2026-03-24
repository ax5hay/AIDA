import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import type { ExplorerFilters } from "./analytics-filters";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private filters(
    from?: string,
    to?: string,
    district?: string,
    facilityId?: string,
  ): ExplorerFilters {
    return { from, to, district, facilityId };
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
  intelligence(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.intelligence(this.filters(from, to, district, facilityId));
  }

  @Get("decision-support")
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
  anomalies(
    @Query("metric") metric?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    const m: "live_births" | "maternal_deaths" =
      metric === "maternal_deaths" ? "maternal_deaths" : "live_births";
    return this.analytics.anomalies(m, this.filters(from, to, district, facilityId));
  }

  @Get("explorer")
  explorer(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("district") district?: string,
    @Query("facilityId") facilityId?: string,
  ) {
    return this.analytics.explorer(this.filters(from, to, district, facilityId));
  }

  @Get("assessments/:id")
  assessmentDetail(@Param("id") id: string) {
    return this.analytics.assessmentDetail(id);
  }
}
