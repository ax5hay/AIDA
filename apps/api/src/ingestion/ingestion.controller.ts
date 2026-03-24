import { Body, Controller, Post } from "@nestjs/common";
import { IngestionService, type IngestAssessmentBody } from "./ingestion.service";

@Controller("ingestion")
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post("assessments")
  create(@Body() body: IngestAssessmentBody) {
    return this.ingestion.createAssessment(body);
  }
}
