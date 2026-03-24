import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiInsightClient, loadAiConfigFromEnv } from "@aida/ai-engine";

@Injectable()
export class AiService {
  private readonly client = new AiInsightClient(loadAiConfigFromEnv());

  isEnabled(): boolean {
    return this.client.isEnabled();
  }

  async insightsFromPayload(payload: unknown): Promise<{ enabled: boolean; text: string | null }> {
    if (!this.client.isEnabled()) {
      return { enabled: false, text: null };
    }
    try {
      const text = await this.client.complete([
        {
          role: "system",
          content:
            "You are a senior public health decision intelligence analyst for CHC maternal and child health. Output: (1) three prioritized operational actions, (2) data caveats, (3) one monitoring metric to watch next period. Be concise, cite only implied counts.",
        },
        {
          role: "user",
          content: `Analyze this JSON snapshot and recommend next actions:\n${JSON.stringify(payload)}`,
        },
      ]);
      return { enabled: true, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "LLM request failed";
      throw new ServiceUnavailableException(`AI insight failed: ${msg}`);
    }
  }
}
