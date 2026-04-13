import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { MetricsModule } from "./metrics/metrics.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { MlModule } from "./ml/ml.module";
import { AiModule } from "./ai/ai.module";
import { FacilitiesModule } from "./facilities/facilities.module";
import { ConfigModule as AppConfigModule } from "./config/config.module";
import { RateLimitGuard } from "./common/rate-limit.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 60_000, max: 200 }),
    PrismaModule,
    AnalyticsModule,
    MetricsModule,
    IngestionModule,
    MlModule,
    AiModule,
    FacilitiesModule,
    AppConfigModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule {}
