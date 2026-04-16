/**
 * Prompt shortening for LLM calls: structured summarization + hard budget caps.
 * Keeps narrative-critical fields (meta, insights, kpis) first; drops or samples heavy arrays.
 */

export type PromptMitigationReport = {
  originalChars: number;
  sentChars: number;
  /** User JSON only (what we send in the user message body after "Analyze…"). */
  estimatedUserTokens: number;
  /** System + user JSON (approximate total prompt to the model). */
  estimatedFullPromptTokens: number;
  budgetChars: number;
  budgetTokensApprox: number;
  llmContextTokens: number;
  reserveTokens: number;
  steps: string[];
  omittedKeys: string[];
  systemPromptCharsApprox: number;
};
const MAX_DEPTH = 14;

function envNum(n: string, def: number): number {
  const v = Number(process.env[n]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

/** Approximate tokens from UTF-8 chars (English + JSON). */
function estimateTokens(chars: number, charsPerToken: number): number {
  return Math.ceil(chars / charsPerToken);
}

export function userContentBudgetChars(): number {
  const ctx = envNum("AI_LLM_CONTEXT_TOKENS", 4096);
  const reserve = envNum("AI_PROMPT_RESERVE_TOKENS", 1000);
  const cpt = envNum("AI_CHARS_PER_TOKEN_ESTIMATE", 4);
  const maxUserTokens = Math.max(512, Math.floor((ctx - reserve) * 0.85));
  const cap = envNum("AI_USER_CONTENT_MAX_CHARS", 6000);
  return Math.min(maxUserTokens * cpt, cap);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function truncateArray<T>(arr: T[], max: number, path: string, steps: string[], omitted: string[]): T[] {
  if (arr.length <= max) return arr;
  steps.push(`${path}: kept first ${max} of ${arr.length} items`);
  omitted.push(`${path}[${max}..]`);
  return arr.slice(0, max);
}

/**
 * Sanitize a public-health intelligence-shaped payload (heavy arrays → samples).
 */
function sanitizeIntelligenceShape(
  root: Record<string, unknown>,
  steps: string[],
  omitted: string[],
): Record<string, unknown> {
  const out = deepClone(root);

  if (Array.isArray(out.sankey_links)) {
    out.sankey_links = truncateArray(
      out.sankey_links as unknown[],
      envNum("AI_SANKEY_LINKS_MAX", 12),
      "sankey_links",
      steps,
      omitted,
    );
  }

  if (isPlainObject(out.gaps)) {
    const g = out.gaps as Record<string, unknown>;
    if (Array.isArray(g.district_heatmap)) {
      g.district_heatmap = truncateArray(
        g.district_heatmap as unknown[],
        envNum("AI_DISTRICT_HEATMAP_MAX", 8),
        "gaps.district_heatmap",
        steps,
        omitted,
      );
    }
    if (Array.isArray(g.management_tables)) {
      g.management_tables = truncateArray(
        g.management_tables as unknown[],
        envNum("AI_MANAGEMENT_TABLES_MAX", 12),
        "gaps.management_tables",
        steps,
        omitted,
      );
    }
  }

  if (Array.isArray(out.pipelines)) {
    const maxStages = envNum("AI_PIPELINE_STAGE_MAX", 12);
    out.pipelines = (out.pipelines as Array<Record<string, unknown>>).map((p, i) => {
      if (!Array.isArray(p.stages)) return p;
      const st = p.stages as unknown[];
      if (st.length <= maxStages) return p;
      steps.push(`pipelines[${i}].stages: kept first ${maxStages} of ${st.length}`);
      omitted.push(`pipelines[${i}].stages[${maxStages}..]`);
      return { ...p, stages: st.slice(0, maxStages) };
    });
  }

  if (isPlainObject(out.correlation_engine)) {
    const ce = out.correlation_engine as Record<string, unknown>;
    if (Array.isArray(ce.extended_matrix)) {
      ce.extended_matrix = truncateArray(
        ce.extended_matrix as unknown[],
        envNum("AI_CORR_MATRIX_MAX", 24),
        "correlation_engine.extended_matrix",
        steps,
        omitted,
      );
    }
    if (isPlainObject(ce.scatter_regression)) {
      const sr = ce.scatter_regression as Record<string, unknown>;
      if (Array.isArray(sr.points)) {
        const max = envNum("AI_SCATTER_POINTS_MAX", 24);
        sr.points = truncateArray(sr.points as unknown[], max, "correlation_engine.scatter_regression.points", steps, omitted);
      }
    }
  }

  if (isPlainObject(out.cohorts)) {
    const c = out.cohorts as Record<string, unknown>;
    if (Array.isArray(c.retention)) {
      c.retention = truncateArray(
        c.retention as unknown[],
        envNum("AI_RETENTION_MAX", 12),
        "cohorts.retention",
        steps,
        omitted,
      );
    }
    if (c.matrix !== undefined) {
      delete c.matrix;
      steps.push("cohorts.matrix: removed (large; use cohorts.registration_month / delivery_month summaries if needed)");
      omitted.push("cohorts.matrix");
    }
    if (Array.isArray(c.registration_month)) {
      c.registration_month = truncateArray(
        c.registration_month as unknown[],
        envNum("AI_COHORT_MONTH_MAX", 8),
        "cohorts.registration_month",
        steps,
        omitted,
      );
    }
    if (Array.isArray(c.delivery_month)) {
      c.delivery_month = truncateArray(
        c.delivery_month as unknown[],
        envNum("AI_COHORT_MONTH_MAX", 8),
        "cohorts.delivery_month",
        steps,
        omitted,
      );
    }
    if (Array.isArray(c.infant_birth_cohort)) {
      c.infant_birth_cohort = truncateArray(
        c.infant_birth_cohort as unknown[],
        envNum("AI_COHORT_MONTH_MAX", 8),
        "cohorts.infant_birth_cohort",
        steps,
        omitted,
      );
    }
  }

  if (isPlainObject(out.time_series)) {
    const ts = out.time_series as Record<string, unknown>;
    const months = ts.months as string[] | undefined;
    const lastN = envNum("AI_TIME_SERIES_MAX_POINTS", 12);
    if (Array.isArray(months) && months.length > lastN) {
      const from = months.length - lastN;
      steps.push(`time_series: kept last ${lastN} of ${months.length} months`);
      omitted.push(`time_series.months[0..${from - 1}]`);
      ts.months = months.slice(-lastN);
      for (const key of Object.keys(ts)) {
        if (key === "months" || key === "spikes" || key === "trend") continue;
        const v = ts[key];
        if (Array.isArray(v) && v.length > lastN) {
          (ts as Record<string, unknown>)[key] = (v as unknown[]).slice(-lastN);
        }
      }
    }
  }

  if (isPlainObject(out.multivariate)) {
    const mv = out.multivariate as Record<string, unknown>;
    if (Array.isArray(mv.bubbles)) {
      mv.bubbles = truncateArray(
        mv.bubbles as unknown[],
        envNum("AI_BUBBLES_MAX", 8),
        "multivariate.bubbles",
        steps,
        omitted,
      );
    }
    if (Array.isArray(mv.anc_ogtt_institutional)) {
      mv.anc_ogtt_institutional = truncateArray(
        mv.anc_ogtt_institutional as unknown[],
        envNum("AI_BUBBLES_MAX", 8),
        "multivariate.anc_ogtt_institutional",
        steps,
        omitted,
      );
    }
  }

  if (isPlainObject(out.anomalies)) {
    const an = out.anomalies as Record<string, unknown>;
    for (const [k, v] of Object.entries(an)) {
      if (isPlainObject(v)) {
        const inner = v as Record<string, unknown>;
        for (const [ik, arr] of Object.entries(inner)) {
          if (Array.isArray(arr) && arr.length > envNum("AI_ANOMALY_IDX_MAX", 6)) {
            const max = envNum("AI_ANOMALY_IDX_MAX", 6);
            inner[ik] = truncateArray(arr as unknown[], max, `anomalies.${k}.${ik}`, steps, omitted);
          }
        }
      }
    }
  }

  if (out.cross_entity !== undefined && out.cross_entity !== null) {
    const ce = typeof out.cross_entity === "string" ? out.cross_entity : JSON.stringify(out.cross_entity);
    const maxCross = envNum("AI_CROSS_ENTITY_MAX_CHARS", 1200);
    if (ce.length > maxCross) {
      out.cross_entity = ce.slice(0, maxCross) + "…[truncated]";
      steps.push(`cross_entity: truncated to ${maxCross} chars`);
      omitted.push("cross_entity[remainder]");
    }
  }

  return out;
}

/** Minimal intelligence slice for LLM when still over budget. */
function minimalIntelligencePack(
  root: Record<string, unknown>,
  steps: string[],
  omitted: string[],
): Record<string, unknown> {
  omitted.push(
    "pipelines (full)",
    "sankey_links",
    "gaps.detailed",
    "correlation_engine.detailed",
    "cohorts",
    "time_series",
    "distributions",
    "multivariate",
    "anomalies",
  );
  steps.push("Applied minimal pack: only meta, insights, kpis, and condensed gaps summary");
  const gaps = isPlainObject(root.gaps) ? (root.gaps as Record<string, unknown>) : {};
  const dh = Array.isArray(gaps.district_heatmap) ? (gaps.district_heatmap as unknown[]).slice(0, 4) : [];
  return {
    meta: root.meta,
    insights: root.insights,
    kpis: root.kpis,
    gap_summary: {
      district_heatmap_top: dh,
      screening: gaps.screening,
      treatment_pregnancy: gaps.treatment_pregnancy,
      outcome: gaps.outcome,
    },
  };
}

export function prepareLlmPayload(
  snapshot: unknown,
  opts?: { systemPromptChars?: number },
): { text: string; report: PromptMitigationReport } {
  const systemChars = opts?.systemPromptChars ?? 0;
  const budgetChars = userContentBudgetChars();
  const ctx = envNum("AI_LLM_CONTEXT_TOKENS", 4096);
  const reserve = envNum("AI_PROMPT_RESERVE_TOKENS", 1000);
  const cpt = envNum("AI_CHARS_PER_TOKEN_ESTIMATE", 4);
  const steps: string[] = [];
  const omitted: string[] = [];

  const raw = JSON.stringify(snapshot);
  const originalChars = raw.length;

  if (!isPlainObject(snapshot)) {
    let text = raw.length <= budgetChars ? raw : `${raw.slice(0, budgetChars - 80)}\n…[hard_truncated]`;
    if (text.length > budgetChars) text = `${text.slice(0, budgetChars - 40)}\n…`;
    steps.push("Non-object snapshot: length-capped only");
    const sentChars = text.length;
    const estUser = estimateTokens(sentChars, cpt);
    const estFull = estimateTokens(sentChars + systemChars, cpt);
    return {
      text,
      report: {
        originalChars,
        sentChars,
        estimatedUserTokens: estUser,
        estimatedFullPromptTokens: estFull,
        budgetChars,
        budgetTokensApprox: Math.floor(budgetChars / cpt),
        llmContextTokens: ctx,
        reserveTokens: reserve,
        steps,
        omittedKeys: omitted,
        systemPromptCharsApprox: systemChars,
      },
    };
  }

  let working: unknown = snapshot;
  if (isPlainObject(snapshot) && "meta" in snapshot && "pipelines" in snapshot) {
    working = sanitizeIntelligenceShape(snapshot as Record<string, unknown>, steps, omitted);
  } else if (isPlainObject(snapshot)) {
    working = genericArrayLimit(snapshot as Record<string, unknown>, 0, steps, omitted);
  }

  let text = JSON.stringify(working);
  if (text.length > budgetChars) {
    if (isPlainObject(working) && "insights" in (working as object)) {
      working = minimalIntelligencePack(working as Record<string, unknown>, steps, omitted);
      text = JSON.stringify(working);
      steps.push("Dropped most heavy sections; kept insights + kpis + compact meta");
    }
  }

  if (text.length > budgetChars) {
    if (isPlainObject(working) && "insights" in (working as object)) {
      working = {
        meta: (working as Record<string, unknown>).meta,
        insights: (working as Record<string, unknown>).insights,
        kpis: (working as Record<string, unknown>).kpis,
      };
      text = JSON.stringify(working);
      steps.push("Ultra-minimal: only meta, insights, kpis");
      omitted.push("all other top-level keys");
    }
  }

  if (text.length > budgetChars) {
    text = `${text.slice(0, budgetChars - 80)}\n…[hard_truncated:${budgetChars} chars]`;
    steps.push(`Hard JSON truncation at ${budgetChars} chars`);
    omitted.push(`json[${budgetChars}..]`);
  }

  const sentChars = text.length;
  const estUser = estimateTokens(sentChars, cpt);
  const estFull = estimateTokens(sentChars + systemChars, cpt);
  const budgetTokensApprox = Math.floor(budgetChars / cpt);

  return {
    text,
    report: {
      originalChars,
      sentChars,
      estimatedUserTokens: estUser,
      estimatedFullPromptTokens: estFull,
      budgetChars,
      budgetTokensApprox,
      llmContextTokens: ctx,
      reserveTokens: reserve,
      steps,
      omittedKeys: [...new Set(omitted)],
      systemPromptCharsApprox: systemChars,
    },
  };
}

function genericArrayLimit(
  obj: Record<string, unknown>,
  depth: number,
  steps: string[],
  omitted: string[],
): Record<string, unknown> {
  if (depth > MAX_DEPTH) return obj;
  const out: Record<string, unknown> = {};
  const maxArr = envNum("AI_GENERIC_ARRAY_MAX", 32);
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      out[k] = truncateArray(v as unknown[], Math.min(maxArr, v.length), k, steps, omitted);
      if (Array.isArray(out[k]) && out[k].length && isPlainObject((out[k] as unknown[])[0])) {
        out[k] = (out[k] as unknown[]).map((item) =>
          isPlainObject(item) ? genericArrayLimit(item as Record<string, unknown>, depth + 1, steps, omitted) : item,
        );
      }
    } else if (isPlainObject(v)) {
      out[k] = genericArrayLimit(v as Record<string, unknown>, depth + 1, steps, omitted);
    } else {
      out[k] = v;
    }
  }
  return out;
}
