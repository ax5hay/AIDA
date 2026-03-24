export type AiEngineConfig = {
  /** Master switch — when false, all AI calls no-op */
  enabled: boolean;
  lmStudioBaseUrl: string | null;
  lmStudioModel: string;
  openaiApiKey: string | null;
  openaiModel: string;
  anthropicApiKey: string | null;
};

export function loadAiConfigFromEnv(): AiEngineConfig {
  return {
    enabled: process.env.AI_INSIGHTS_ENABLED === "true",
    lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL ?? null,
    lmStudioModel: process.env.LM_STUDIO_MODEL ?? "local-model",
    openaiApiKey: process.env.OPENAI_API_KEY ?? null,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
  };
}
