import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IngestionService, type IngestAssessmentBody } from "./ingestion.service";
import { IngestionAuthGuard } from "./ingestion-auth.guard";

@Controller("ingestion")
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Get("schema")
  schema() {
    return this.ingestion.getSchema();
  }

  @Post("assessments")
  @UseGuards(IngestionAuthGuard)
  create(@Body() body: IngestAssessmentBody) {
    return this.ingestion.createAssessment(body);
  }
}
