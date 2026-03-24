import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AiInsightClient, loadAiConfigFromEnv, normalizeLmStudioBaseUrl } from "@aida/ai-engine";

@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);
  private readonly client = new AiInsightClient(loadAiConfigFromEnv());

  isEnabled(): boolean {
    return this.client.isEnabled();
  }

  /**
   * Lists models from LM Studio OpenAI-compatible GET /v1/models.
   * Returns an empty list when LM Studio is not configured, unreachable, or returns an error — avoids 500s when the desktop app is closed.
   */
  async listModels(): Promise<{ data: Array<{ id: string }> }> {
    const base = normalizeLmStudioBaseUrl(process.env.LM_STUDIO_BASE_URL);
    if (!base) {
      return { data: [] };
    }
    try {
      const res = await fetch(`${base}/models`);
      if (!res.ok) {
        const t = await res.text();
        this.log.warn(`LM Studio /models HTTP ${res.status}: ${t.slice(0, 120)}`);
        return { data: [] };
      }
      return res.json() as Promise<{ data: Array<{ id: string }> }>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`LM Studio unreachable (${base}): ${msg}`);
      return { data: [] };
    }
  }

  async insightsFromPayload(
    payload: unknown,
    model?: string,
  ): Promise<{ enabled: boolean; text: string | null }> {
    if (!this.client.isEnabled()) {
      return { enabled: false, text: null };
    }
    try {
      const text = await this.client.complete(
        [
          {
            role: "system",
            content:
              "You are a senior public health decision intelligence analyst for CHC maternal and child health. Output: (1) three prioritized operational actions, (2) data caveats, (3) one monitoring metric to watch next period. Be concise, cite only implied counts.",
          },
          {
            role: "user",
            content: `Analyze this JSON snapshot and recommend next actions:\n${JSON.stringify(payload)}`,
          },
        ],
        { model: model?.trim() || undefined },
      );
      return { enabled: true, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "LLM request failed";
      throw new ServiceUnavailableException(`AI insight failed: ${msg}`);
    }
  }

  /**
   * Public health intelligence: always returns deterministic structured insights when present;
   * optionally augments with LLM (LM Studio / OpenAI-compatible) — never replaces rule-based metrics.
   */
  async intelligenceInsights(
    snapshot: unknown,
    model?: string,
  ): Promise<{
    enabled: boolean;
    deterministic: unknown;
    llm: string | null;
    llmError?: string;
  }> {
    const deterministic =
      snapshot !== null &&
      typeof snapshot === "object" &&
      "insights" in snapshot &&
      (snapshot as { insights?: unknown }).insights !== undefined
        ? (snapshot as { insights: unknown }).insights
        : snapshot;

    if (!this.client.isEnabled()) {
      return { enabled: false, deterministic, llm: null };
    }
    try {
      const text = await this.client.complete(
        [
          {
            role: "system",
            content:
              "You are a senior public health intelligence analyst for CHC maternal and child health. Given deterministic JSON (pipelines, gaps, correlations, anomalies), produce: (1) three prioritized operational hypotheses tied to the worst bottleneck or gap, (2) likely system causes (documentation vs access vs clinical), (3) concrete interventions. If counts are missing, say so. Do not invent numbers beyond the JSON.",
          },
          {
            role: "user",
            content: `Analyze this public health intelligence snapshot:\n${JSON.stringify(snapshot)}`,
          },
        ],
        { model: model?.trim() || undefined },
      );
      return { enabled: true, deterministic, llm: text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "LLM request failed";
      return { enabled: true, deterministic, llm: null, llmError: msg };
    }
  }
}
