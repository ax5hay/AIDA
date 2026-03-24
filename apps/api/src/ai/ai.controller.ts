import { Body, Controller, Get, Post } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("status")
  status() {
    return { enabled: this.ai.isEnabled() };
  }

  @Post("insights")
  insights(@Body() body: { snapshot: unknown }) {
    return this.ai.insightsFromPayload(body?.snapshot ?? {});
  }
}
