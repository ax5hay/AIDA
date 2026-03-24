import { Body, Controller, Get, Post } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("status")
  status() {
    return { enabled: this.ai.isEnabled() };
  }

  /** Proxies LM Studio OpenAI-compatible GET /v1/models when LM_STUDIO_BASE_URL is set */
  @Get("models")
  models() {
    return this.ai.listModels();
  }

  @Post("insights")
  insights(@Body() body: { snapshot?: unknown; model?: string }) {
    return this.ai.insightsFromPayload(body?.snapshot ?? {}, body?.model);
  }

  /** Hybrid: deterministic intelligence block + optional LLM narrative (LM Studio primary when configured) */
  @Post("intelligence-insights")
  intelligenceInsights(@Body() body: { snapshot?: unknown; model?: string }) {
    return this.ai.intelligenceInsights(body?.snapshot ?? {}, body?.model);
  }
}
