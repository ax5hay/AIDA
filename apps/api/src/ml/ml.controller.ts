import { Controller, Get, Query } from "@nestjs/common";
import { MlService } from "./ml.service";
import type { ExplorerFilters } from "../analytics/analytics-filters";
import { parseExplorerFilters } from "../analytics/analytics-filters";
import { RateLimit } from "../common/rate-limit.decorator";

@Controller("ml")
export class MlController {
  constructor(private readonly ml: MlService) {}

  private filters(
    from?: string,
    to?: string,
    district?: string,
    facilityId?: string,
  ): ExplorerFilters {
    return parseExplorerFilters(from, to, district, facilityId);
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
    return this.ml.anomalies(m, this.filters(from, to, district, facilityId), p, s);
  }
}
