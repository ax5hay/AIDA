import { Controller, Get, Param, Query } from "@nestjs/common";
import { AnalyticsService, type ExplorerFilters } from "./analytics.service";

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
