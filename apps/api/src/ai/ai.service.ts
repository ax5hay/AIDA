import { Injectable, Logger } from "@nestjs/common";
import { AiInsightClient, loadAiConfigFromEnv, normalizeLmStudioBaseUrl } from "@aida/ai-engine";
import { prepareLlmPayload, type PromptMitigationReport } from "./prompt-mitigation";

const OVERVIEW_SYSTEM = `You are a senior public health decision intelligence analyst for maternal and child health at health facilities. Output: (1) three prioritized operational actions, (2) data caveats, (3) one monitoring metric to watch next period. Be concise, cite only implied counts. Use clear Markdown: short paragraphs, numbered or bulleted lists, and **bold** for key terms — avoid dumping unformatted asterisks or wall-of-text.`;

const INTELLIGENCE_SYSTEM = `You are a senior public health intelligence analyst for maternal and child health at health facilities. Given deterministic JSON (pipelines, gaps, correlations, anomalies), produce: (1) three prioritized operational hypotheses tied to the worst bottleneck or gap, (2) likely system causes (documentation vs access vs clinical), (3) concrete interventions. If counts are missing, say so. Do not invent numbers beyond the JSON. Format with Markdown headings (##), bullets, and **bold** emphasis so the UI can render structure — do not output raw unstructured asterisks.`;

@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);
  private readonly client = new AiInsightClient(loadAiConfigFromEnv());
  private readonly modelListTimeoutMs = Number(process.env.AI_MODEL_LIST_TIMEOUT_MS ?? 4_000);

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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.modelListTimeoutMs);
      const res = await fetch(`${base}/models`, { signal: controller.signal }).finally(() =>
        clearTimeout(timeout),
      );
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
  ): Promise<{
    enabled: boolean;
    text: string | null;
    llmError?: string;
    mitigation?: PromptMitigationReport;
  }> {
    if (!this.client.isEnabled()) {
      return { enabled: false, text: null };
    }
    let mitigation: PromptMitigationReport | undefined;
    try {
      const { text: userJson, report } = prepareLlmPayload(payload, { systemPromptChars: OVERVIEW_SYSTEM.length });
      mitigation = report;
      const userContent = `Analyze this JSON snapshot and recommend next actions:\n${userJson}`;
      this.log.debug(
        `LLM overview payload: ${report.originalChars}→${report.sentChars} chars, ~${report.estimatedFullPromptTokens} tok (full)`,
      );
      const text = await this.client.complete(
        [
          { role: "system", content: OVERVIEW_SYSTEM },
          { role: "user", content: userContent },
        ],
        { model: model?.trim() || undefined },
      );
      return { enabled: true, text, mitigation: report };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "LLM request failed";
      return { enabled: true, text: null, llmError: msg, mitigation };
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
    mitigation?: PromptMitigationReport;
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
    let mitigation: PromptMitigationReport | undefined;
    try {
      const { text: userJson, report } = prepareLlmPayload(snapshot, { systemPromptChars: INTELLIGENCE_SYSTEM.length });
      mitigation = report;
      const userContent = `Analyze this public health intelligence snapshot:\n${userJson}`;
      this.log.debug(
        `LLM intelligence payload: ${report.originalChars}→${report.sentChars} chars, ~${report.estimatedFullPromptTokens} tok (full)`,
      );
      const text = await this.client.complete(
        [
          { role: "system", content: INTELLIGENCE_SYSTEM },
          { role: "user", content: userContent },
        ],
        { model: model?.trim() || undefined },
      );
      return { enabled: true, deterministic, llm: text, mitigation: report };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "LLM request failed";
      return { enabled: true, deterministic, llm: null, llmError: msg, mitigation };
    }
  }
}
