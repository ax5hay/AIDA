import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import type { ExplorerFilters } from "../analytics/analytics.service";

@Injectable()
export class MlService {
  constructor(private readonly analytics: AnalyticsService) {}

  anomalies(metric: "live_births" | "maternal_deaths", f: ExplorerFilters) {
    return this.analytics.anomalies(metric, f);
  }
}
