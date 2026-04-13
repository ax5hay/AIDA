import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService } from "./ingestion.service";
import { IngestionAuthGuard } from "./ingestion-auth.guard";

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, IngestionAuthGuard],
})
export class IngestionModule {}
