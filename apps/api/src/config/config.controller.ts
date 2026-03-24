import { Controller, Get } from "@nestjs/common";

@Controller("config")
export class ConfigController {
  @Get()
  getPublicConfig() {
    return {
      apiVersion: "0.1.0",
      webOrigin: process.env.WEB_ORIGIN ?? null,
      aiInsightsEnabled: process.env.AI_INSIGHTS_ENABLED === "true",
      aiProviderReady: !!(process.env.LM_STUDIO_BASE_URL || process.env.OPENAI_API_KEY),
      defaultApiBase: process.env.PUBLIC_API_BASE ?? "http://localhost:4000/v1",
    };
  }
}
