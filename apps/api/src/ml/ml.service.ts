import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import type { ExplorerFilters } from "../analytics/analytics-filters";

@Injectable()
export class MlService {
  constructor(private readonly analytics: AnalyticsService) {}

  anomalies(
    metric: "live_births" | "maternal_deaths",
    f: ExplorerFilters,
    page?: number,
    pageSize?: number,
  ) {
    return this.analytics.anomalies(metric, f, page, pageSize);
  }
}
