import OpenAI from "openai";
import type { AiEngineConfig } from "./config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Optional GenAI: LM Studio (OpenAI-compatible) first, then OpenAI if key present.
 * System works without LLM — callers must handle disabled mode.
 */
export class AiInsightClient {
  constructor(private readonly config: AiEngineConfig) {}

  isEnabled(): boolean {
    return this.config.enabled && (this.config.lmStudioBaseUrl !== null || this.config.openaiApiKey !== null);
  }

  async complete(messages: ChatMessage[]): Promise<string | null> {
    if (!this.config.enabled) return null;

    if (this.config.lmStudioBaseUrl) {
      const client = new OpenAI({
        baseURL: this.config.lmStudioBaseUrl,
        apiKey: "lm-studio",
      });
      const res = await client.chat.completions.create({
        model: this.config.lmStudioModel,
        messages,
      });
      return res.choices[0]?.message?.content ?? null;
    }

    if (this.config.openaiApiKey) {
      const client = new OpenAI({ apiKey: this.config.openaiApiKey });
      const res = await client.chat.completions.create({
        model: this.config.openaiModel,
        messages,
      });
      return res.choices[0]?.message?.content ?? null;
    }

    return null;
  }
}
