import type { PipelineBundle } from "./pipelines";
import type { GapTriple } from "./intelligence";

export type WhatWhyNext = {
  what: string;
  why: string;
  next: string;
};

export type IntelligenceInsightBlock = {
  pipelines: WhatWhyNext;
  gaps: WhatWhyNext;
  correlations: WhatWhyNext;
  cohorts: WhatWhyNext;
  trends: WhatWhyNext;
  anomalies: WhatWhyNext;
};

type KpiSnapshot = {
  hiv_screening: number | null;
  hgb_screening: number | null;
  maternal_mortality: number | null;
  lbw: number | null;
  institutional_delivery: number | null;
};

/**
 * Deterministic narrative — always available without LLM.
 * Answers: what is happening, why (data-linked hypotheses), what to do next.
 */
export function deterministicIntelligenceInsights(opts: {
  pipelines: PipelineBundle[];
  screeningGap: GapTriple;
  treatmentGapPregnancy: GapTriple;
  outcomeGap: GapTriple;
  kpis: KpiSnapshot;
  trendLabels: { hiv: string; lbw: string };
  anomalyCount: number;
}): IntelligenceInsightBlock {
  const worstPipe = [...opts.pipelines].sort((a, b) => {
    const da = a.bottleneckIndex !== null ? (a.stages[a.bottleneckIndex!]?.dropOffFromPrior ?? 0) : 0;
    const db = b.bottleneckIndex !== null ? (b.stages[b.bottleneckIndex!]?.dropOffFromPrior ?? 0) : 0;
    return db - da;
  })[0];

  const bottleneckLabel =
    worstPipe?.bottleneckIndex !== null
      ? `${worstPipe.label}: ${worstPipe.stages[worstPipe.bottleneckIndex!]?.label ?? "stage"}`
      : "no clear bottleneck (check non-monotonic stages)";

  const pipelines: WhatWhyNext = {
    what: `Largest sequential drop in reporting volumes is at ${bottleneckLabel}.`,
    why:
      "Different stages use different form tables and denominators; sharp drops often reflect documentation gaps or eligibility mismatch, not only clinical loss.",
    next: "Validate denominator alignment for the bottleneck stage and audit facility data completeness for that transition.",
  };

  const sg = opts.screeningGap;
  const tg = opts.treatmentGapPregnancy;
  const og = opts.outcomeGap;

  const gaps: WhatWhyNext = {
    what: `Screening gap ${sg.gap} (eligible ${sg.eligible}, observed ${sg.observed}); pregnancy treatment gap ${tg.gap}; outcome gap ${og.gap}.`,
    why:
      "Gaps compare summed facility-reported numerators to policy-eligible denominators from the same window — shortfalls highlight system access or documentation failures.",
    next: "Prioritize districts with highest gap rates; pair supply-side fixes (tests, staff) with register reconciliation workshops.",
  };

  const k = opts.kpis;
  const correlations: WhatWhyNext = {
    what: `ANC HIV coverage ${k.hiv_screening !== null ? `${(k.hiv_screening * 100).toFixed(1)}%` : "n/a"}; LBW rate ${k.lbw !== null ? `${(k.lbw * 100).toFixed(1)}%` : "n/a"}.`,
    why: "Correlation panels link risk factors to outcomes at the assessment-row level — association does not imply individual causation.",
    next: "Use significant pairs to target bundled interventions (e.g., anemia + nutrition when anemia–LBW link is strong).",
  };

  const cohorts: WhatWhyNext = {
    what: "Cohort views group assessments by calendar month of reporting to compare outcome and follow-up intensity.",
    why: "Seasonality and campaign timing can shift denominators; month buckets approximate cohorts when line-list data are unavailable.",
    next: "Compare early vs late months in the filter for retention slippage; align outreach with low follow-up months.",
  };

  const trends: WhatWhyNext = {
    what: `Trend classification: HIV screening ${opts.trendLabels.hiv}; LBW ${opts.trendLabels.lbw}.`,
    why: "Trends split the series into first vs second half of the filtered window — a simple directional signal for dashboards.",
    next: "If mortality or LBW trends up while screening is flat, escalate supervision and referral pathways.",
  };

  const anomalies: WhatWhyNext = {
    what: `${opts.anomalyCount} statistical anomaly point(s) flagged across screened metrics (z-score / IQR / isolation).`,
    why: "Spikes may be real surges, data entry bursts, or facility batch uploads — always triangulate with remarks and documents.",
    next: "Drill into flagged facility-month rows; reconcile with district verification before operational response.",
  };

  return { pipelines, gaps, correlations, cohorts, trends, anomalies };
}
