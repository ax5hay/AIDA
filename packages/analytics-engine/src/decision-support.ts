/**
 * Deterministic decision-support helpers — interpretable formulas, no ML.
 */

export type ActionSignal = "gap" | "correlation" | "anomaly" | "pipeline" | "trend" | "region";

export type RecommendedAction = {
  rank: number;
  title: string;
  rationale: string;
  signal: ActionSignal;
};

export type ProgramHealthBreakdown = {
  /** 0–100 */
  coverage: number;
  /** 0–100 */
  outcomes: number;
  /** 0–100 — higher is better (lower structural gaps) */
  gap_equity: number;
};

export type ProgramHealthScore = {
  /** 0–100 composite */
  score: number;
  breakdown: ProgramHealthBreakdown;
  /** Short labels for UI */
  notes: string[];
};

export type DecisionAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  source: "threshold" | "anomaly" | "cluster" | "coverage_trend" | "validation";
};

export type WhatIfScenario = {
  id: string;
  label: string;
  /** Assumptions in plain language */
  assumption: string;
  projected: {
    hiv_screening_rate: number | null;
    lbw_rate: number | null;
    maternal_mortality_rate: number | null;
  };
};

export type DataQualitySummary = {
  /** Share of assessments missing at least one core section (ANC or delivery) */
  missing_core_sections_pct: number;
  validation_issue_count: number;
  /** Heuristic: z + IQR + isolation flags counted once per assessment index */
  suspicious_assessment_flags: number;
};

/**
 * Composite score: 40% coverage + 35% outcomes + 25% gap equity (all 0–100 subscores).
 */
export function computeProgramHealthScore(input: {
  screening_rate_hiv: number | null;
  screening_rate_hgb_4x: number | null;
  screening_rate_bp: number | null;
  maternal_mortality_rate: number | null;
  early_neonatal_mortality_rate: number | null;
  lbw_rate: number | null;
  preterm_rate: number | null;
  screening_gap_rate: number | null;
  treatment_gap_rate: number | null;
}): ProgramHealthScore {
  const covs = [
    input.screening_rate_hiv,
    input.screening_rate_hgb_4x,
    input.screening_rate_bp,
  ].filter((x): x is number => x !== null && !Number.isNaN(x));
  const coverage =
    covs.length > 0 ? (covs.reduce((a, b) => a + b, 0) / covs.length) * 100 : 50;

  const mat = input.maternal_mortality_rate ?? 0;
  const neo = input.early_neonatal_mortality_rate ?? 0;
  const lbw = input.lbw_rate ?? 0;
  const pt = input.preterm_rate ?? 0;
  const risk = Math.min(1, mat * 400 + neo * 200 + lbw * 2 + pt * 1.5);
  const outcomes = Math.max(0, Math.min(100, 100 * (1 - risk)));

  const sg = input.screening_gap_rate ?? 0;
  const tg = input.treatment_gap_rate ?? 0;
  const gapRaw = Math.min(1, 0.5 * sg + 0.5 * tg);
  const gap_equity = Math.max(0, Math.min(100, 100 * (1 - gapRaw)));

  const score = Math.round(0.4 * coverage + 0.35 * outcomes + 0.25 * gap_equity);
  const notes = [
    "Coverage subscore averages HIV, Hb×4, and BP screening rates vs ANC registration.",
    "Outcomes subscore penalizes mortality, neonatal death, LBW, and preterm rates (scaled).",
    "Gap equity rewards closing screening and pregnancy treatment gaps.",
  ];
  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: {
      coverage: Math.round(coverage),
      outcomes: Math.round(outcomes),
      gap_equity: Math.round(gap_equity),
    },
    notes,
  };
}

export function topFiveActions(input: {
  screening_gap_rate: number | null;
  treatment_gap_rate: number | null;
  bottleneck: { pipeline: string; label: string } | null;
  worst_district: string | null;
  strong_correlations: Array<{ label: string; pearson: number | null }>;
  anomaly_count: number;
  trend_hiv: string;
  trend_lbw: string;
  chi_anemia_preterm_p: number | null;
}): RecommendedAction[] {
  const out: RecommendedAction[] = [];
  let rank = 1;

  if (input.screening_gap_rate !== null && input.screening_gap_rate > 0.15) {
    out.push({
      rank: rank++,
      title: "Close ANC screening gap (HIV vs registered)",
      rationale: `Screening gap rate is ${(input.screening_gap_rate * 100).toFixed(1)}% — prioritize test access, queueing, and register reconciliation.`,
      signal: "gap",
    });
  }

  if (input.treatment_gap_rate !== null && input.treatment_gap_rate > 0.15) {
    out.push({
      rank: rank++,
      title: "Accelerate pregnancy case management",
      rationale: `Treatment gap (identified vs managed) is ${(input.treatment_gap_rate * 100).toFixed(1)}% — supervision and referral loops.`,
      signal: "gap",
    });
  }

  if (input.bottleneck) {
    out.push({
      rank: rank++,
      title: `Relieve pipeline bottleneck: ${input.bottleneck.pipeline}`,
      rationale: `Largest sequential drop at “${input.bottleneck.label}” — verify denominators and documentation.`,
      signal: "pipeline",
    });
  }

  if (input.worst_district) {
    out.push({
      rank: rank++,
      title: `Supervise highest-burden district: ${input.worst_district}`,
      rationale: "Combined screening/treatment/LBW severity ranks this district worst in the current filter.",
      signal: "region",
    });
  }

  for (const c of input.strong_correlations) {
    if (c.pearson !== null && Math.abs(c.pearson) > 0.35 && out.length < 5) {
      out.push({
        rank: rank++,
        title: `Investigate linked signal: ${c.label}`,
        rationale: `Correlation strength |r|=${Math.abs(c.pearson).toFixed(2)} — bundle interventions, not single indicators.`,
        signal: "correlation",
      });
      break;
    }
  }

  if (input.anomaly_count > 0 && out.length < 5) {
    out.push({
      rank: rank++,
      title: "Triage data anomalies before policy response",
      rationale: `${input.anomaly_count} statistical flags (z-score / IQR / isolation) — confirm facility-month rows.`,
      signal: "anomaly",
    });
  }

  if (input.trend_hiv === "down" && out.length < 5) {
    out.push({
      rank: rank++,
      title: "Recover HIV screening trajectory",
      rationale: "HIV coverage trend is down in the filtered window — restock tests and supervision visits.",
      signal: "trend",
    });
  }

  if (input.trend_lbw === "up" && out.length < 5) {
    out.push({
      rank: rank++,
      title: "Address rising LBW trend",
      rationale: "LBW rate trend is up — link with anemia/nutrition pathways and institutional delivery.",
      signal: "trend",
    });
  }

  if (input.chi_anemia_preterm_p !== null && input.chi_anemia_preterm_p < 0.1 && out.length < 5) {
    out.push({
      rank: rank++,
      title: "Target anemia–preterm co-occurrence",
      rationale: "χ² suggests non-random anemia×preterm association in assessment windows.",
      signal: "correlation",
    });
  }

  if (out.length < 5) {
    out.push({
      rank: rank++,
      title: "Maintain documentation quality",
      rationale: "Continue cross-checking registers vs screening numerators monthly.",
      signal: "gap",
    });
  }

  return out.slice(0, 5).map((a, i) => ({ ...a, rank: i + 1 }));
}

export function buildAlertCenter(input: {
  maternal_mortality_rate: number | null;
  screening_rate_hiv: number | null;
  screening_rate_hgb_4x: number | null;
  trend_hiv: string;
  trend_lbw: string;
  district_hotspots: Array<{ district: string; severity_score: number }>;
  z_live: number;
  z_hiv: number;
  validation_issue_count: number;
}): DecisionAlert[] {
  const alerts: DecisionAlert[] = [];
  if (input.maternal_mortality_rate !== null && input.maternal_mortality_rate > 0.002) {
    alerts.push({
      id: "mat-mortality",
      severity: "critical",
      title: "Elevated maternal mortality signal",
      detail: `Rate ${input.maternal_mortality_rate.toFixed(5)} per live birth — escalate clinical and referral review.`,
      source: "threshold",
    });
  }
  if (input.screening_rate_hiv !== null && input.screening_rate_hiv < 0.85) {
    alerts.push({
      id: "hiv-coverage",
      severity: "warning",
      title: "HIV screening below 85% of ANC",
      detail: "Prioritize testing workflow continuity.",
      source: "threshold",
    });
  }
  if (input.screening_rate_hgb_4x !== null && input.screening_rate_hgb_4x < 0.75) {
    alerts.push({
      id: "hb-coverage",
      severity: "warning",
      title: "Hb×4 surveillance below 75%",
      detail: "Strengthen anemia monitoring across trimesters.",
      source: "threshold",
    });
  }
  if (input.trend_hiv === "down") {
    alerts.push({
      id: "hiv-trend",
      severity: "warning",
      title: "HIV coverage trend declining",
      detail: "Compare first vs second half of the filter window.",
      source: "coverage_trend",
    });
  }
  if (input.trend_lbw === "up") {
    alerts.push({
      id: "lbw-trend",
      severity: "warning",
      title: "LBW rate trend rising",
      detail: "Review nutrition and anemia programs in parallel.",
      source: "coverage_trend",
    });
  }
  for (const d of input.district_hotspots.slice(0, 3)) {
    if (d.severity_score > 0.25) {
      alerts.push({
        id: `cluster-${d.district}`,
        severity: "warning",
        title: `High-burden cluster: ${d.district}`,
        detail: `Composite severity ${d.severity_score.toFixed(3)} — targeted supervision.`,
        source: "cluster",
      });
    }
  }
  if (input.z_live + input.z_hiv > 4) {
    alerts.push({
      id: "stat-anomaly",
      severity: "info",
      title: "Multiple statistical anomalies flagged",
      detail: "Validate facility-month entries before operational response.",
      source: "anomaly",
    });
  }
  if (input.validation_issue_count > 0) {
    alerts.push({
      id: "validation",
      severity: "info",
      title: "Register consistency checks failed",
      detail: `${input.validation_issue_count} row-level validation flags — audit source forms.`,
      source: "validation",
    });
  }
  return alerts.slice(0, 12);
}

export function whatIfScenarios(base: {
  hiv_screening_rate: number | null;
  lbw_rate: number | null;
  maternal_mortality_rate: number | null;
}): WhatIfScenario[] {
  const hiv = base.hiv_screening_rate ?? 0;
  const lbw = base.lbw_rate ?? 0;
  const mat = base.maternal_mortality_rate ?? 0;

  const anc20: WhatIfScenario = {
    id: "anc_hiv_plus20pct",
    label: "ANC-linked HIV coverage +20% (relative)",
    assumption: "Multiply current HIV/ANC rate by 1.2, capped at 100%. Mortality/LBW adjusted slightly via illustrative elasticity.",
    projected: {
      hiv_screening_rate: Math.min(1, hiv * 1.2),
      lbw_rate: Math.max(0, lbw * 0.97),
      maternal_mortality_rate: Math.max(0, mat * 0.95),
    },
  };

  const anemia10: WhatIfScenario = {
    id: "anemia_down10pct",
    label: "Pregnancy anemia burden −10% (relative)",
    assumption: "Illustrative: reduce anemia-linked risk; LBW and mortality improve marginally.",
    projected: {
      hiv_screening_rate: hiv || null,
      lbw_rate: Math.max(0, lbw * 0.9),
      maternal_mortality_rate: Math.max(0, mat * 0.98),
    },
  };

  return [anc20, anemia10];
}

export function storySteps(meta: {
  assessmentCount: number;
  healthScore: number;
  hiv: number | null;
  topAction: string;
}): Array<{ step: number; title: string; narrative: string }> {
  return [
    {
      step: 1,
      title: "Scope",
      narrative: `You are viewing ${meta.assessmentCount} facility–month assessments in the active filter. Start by confirming the time window and geography match your decision question.`,
    },
    {
      step: 2,
      title: "Coverage pulse",
      narrative: `HIV screening as a share of ANC registration is ${meta.hiv !== null ? `${(meta.hiv * 100).toFixed(1)}%` : "not available"} — this anchors whether downstream outcomes are interpretable.`,
    },
    {
      step: 3,
      title: "Program health score",
      narrative: `Composite score ${meta.healthScore}/100 blends coverage, outcomes, and gap closure — use the breakdown bars to see which leg drags performance.`,
    },
    {
      step: 4,
      title: "Prioritized action",
      narrative: `${meta.topAction}`,
    },
    {
      step: 5,
      title: "Next monitoring period",
      narrative:
        "Re-run the same filters next cycle; watch trend arrows and anomaly flags before scaling interventions.",
    },
  ];
}
