import { Controller, Get } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get("health")
  health() {
    return this.metrics.health();
  }

  @Get("counts")
  counts() {
    return this.metrics.counts();
  }
}
