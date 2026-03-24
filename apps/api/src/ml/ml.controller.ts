import { Controller, Get, Query } from "@nestjs/common";
import { MlService } from "./ml.service";
import type { ExplorerFilters } from "../analytics/analytics-filters";

@Controller("ml")
export class MlController {
  constructor(private readonly ml: MlService) {}

  private filters(
    from?: string,
    to?: string,
    district?: string,
    facilityId?: string,
  ): ExplorerFilters {
    return { from, to, district, facilityId };
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
    return this.ml.anomalies(m, this.filters(from, to, district, facilityId));
  }
}
