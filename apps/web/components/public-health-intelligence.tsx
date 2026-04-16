"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { AnalyticsFilters } from "@/lib/query-params";
import { getIntelligence, postAiIntelligenceInsights } from "@/lib/api";
import type { PublicHealthIntelligenceResponse } from "@/lib/types";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { correlationMatrixCellHeatClass } from "@/lib/correlation-heatmap";
import { cn } from "@aida/ui";

const TOOLTIP_PROPS = {
  contentStyle: {
    background: "#0c0d12",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    fontSize: 12,
    color: "#e4e4e7",
  },
  labelStyle: { color: "#a1a1aa", fontWeight: 500 },
  itemStyle: { color: "#e4e4e7" },
  wrapperStyle: { outline: "none" },
} as const;

const CHART_AXIS = { tick: { fill: "#a1a1aa", fontSize: 11 } };

function pct(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  return `${(v * 100).toFixed(digits)}%`;
}

function InsightBlock({
  title,
  what,
  why,
  next,
}: {
  title: string;
  what: string;
  why: string;
  next: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
      <h4 className="text-xs font-medium uppercase tracking-wide text-cyan-400/90">{title}</h4>
      <dl className="mt-3 space-y-2 text-zinc-300">
        <div>
          <dt className="text-[10px] text-zinc-500">What</dt>
          <dd>{what}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-zinc-500">Why</dt>
          <dd className="text-zinc-400">{why}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-zinc-500">Next</dt>
          <dd className="text-emerald-200/90">{next}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PublicHealthIntelligence({ data }: { data: PublicHealthIntelligenceResponse | undefined }) {
  const [aiText, setAiText] = useState<string | null>(null);
  const aiMut = useMutation({
    mutationFn: () => postAiIntelligenceInsights(data ?? {}),
    onSuccess: (r) => setAiText(r.llm ?? r.llmError ?? null),
  });

  const pipelines = data?.pipelines ?? [];
  const ts = data?.time_series;

  const lineData =
    ts?.months?.map((m, i) => ({
      month: m.slice(5),
      hiv: ts.hiv_screening_rate?.[i] ?? null,
      hiv_ma: ts.hiv_ma3?.[i] ?? null,
      lbw: ts.lbw_rate?.[i] ?? null,
    })) ?? [];

  const gaps = data?.gaps;
  const corr = data?.correlation_engine;
  const dist = data?.distributions;
  const multi = data?.multivariate;
  const kpis = data?.kpis;
  const insights = data?.insights;

  const matrixNames = [
    ...new Set((corr?.extended_matrix ?? []).flatMap((c) => [c.row, c.col])),
  ].sort((a, b) => a.localeCompare(b));
  const matrixLookup = new Map(
    (corr?.extended_matrix ?? []).map((cell) => [`${cell.row}::${cell.col}`, cell.r]),
  );

  const bubbleData =
    multi?.bubbles?.map((b) => ({
      x: b.anc_registered,
      y: b.diabetes_identified,
      z: b.institutional_rate ?? 0,
      id: b.assessmentId,
    })) ?? [];

  const ogttData =
    multi?.anc_ogtt_institutional?.map((b) => ({
      x: b.x,
      y: b.y,
      z: b.z ?? 0,
      id: b.assessmentId,
    })) ?? [];

  return (
    <div className="min-w-0 space-y-12">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-transparent p-5 sm:p-6"
      >
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-400/90">
          Public health intelligence
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-400">
          Multi-dimensional layer on top of existing analytics: standardized pipelines, gap heatmaps, Pearson/Spearman
          correlations, χ² / risk ratios, cohort and time-series views, anomaly detection (z-score, IQR, isolation
          forest), and cross-entity mother–infant links. Cached server-side for performance.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-zinc-300">
            Assessments: {data?.meta.assessmentCount ?? "—"}
          </span>
          {kpis?.deltas_half_window?.hiv_screening_pp != null ? (
            <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-zinc-300">
              Δ HIV coverage (2nd vs 1st half): {pct(kpis.deltas_half_window.hiv_screening_pp)}
            </span>
          ) : null}
          {kpis?.deltas_half_window?.lbw_rate_pp != null ? (
            <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-zinc-300">
              Δ LBW rate: {pct(kpis.deltas_half_window.lbw_rate_pp)}
            </span>
          ) : null}
          <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-zinc-300">
            Trends: HIV {ts?.trend?.hiv_screening ?? "—"} · LBW {ts?.trend?.lbw ?? "—"}
          </span>
        </div>
      </motion.section>

      {/* Deterministic Q&A */}
      {insights ? (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {insights.pipelines ? (
            <InsightBlock title="Pipelines" {...insights.pipelines} />
          ) : null}
          {insights.gaps ? <InsightBlock title="Gaps" {...insights.gaps} /> : null}
          {insights.correlations ? <InsightBlock title="Correlations" {...insights.correlations} /> : null}
          {insights.cohorts ? <InsightBlock title="Cohorts" {...insights.cohorts} /> : null}
          {insights.trends ? <InsightBlock title="Trends" {...insights.trends} /> : null}
          {insights.anomalies ? <InsightBlock title="Anomalies" {...insights.anomalies} /> : null}
        </section>
      ) : null}

      {/* AI augmentation */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h3 className="text-sm font-medium text-white">AI insight layer</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Optional LLM narrative (LM Studio when configured). Deterministic blocks above always apply; this never
          replaces metrics.
        </p>
        <button
          type="button"
          disabled={!data || aiMut.isPending}
          onClick={() => data && aiMut.mutate()}
          className="mt-3 rounded-lg border border-violet-500/40 bg-violet-950/30 px-4 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-900/40 disabled:opacity-40"
        >
          {aiMut.isPending ? "Generating…" : "Generate LLM hypotheses (optional)"}
        </button>
        {aiText ? (
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 font-sans text-xs leading-relaxed text-zinc-300">
            {aiText}
          </pre>
        ) : null}
      </div>

      {/* Pipelines — funnel bars */}
      <section className="space-y-6">
        <h3 className="text-sm font-medium text-white">Pipeline funnels (drop-off & bottleneck)</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {pipelines.map((p) => (
            <div key={p.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{p.label}</p>
              {p.bottleneckId ? (
                <p className="mt-1 text-[11px] text-amber-200/80">
                  Bottleneck: {p.stages.find((s) => s.id === p.bottleneckId)?.label ?? p.bottleneckId}
                </p>
              ) : null}
              <div className="mt-3 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={p.stages.map((s) => ({
                      stage: s.label.slice(0, 32),
                      count: s.count,
                      drop: s.dropOffFromPrior !== null ? s.dropOffFromPrior * 100 : 0,
                    }))}
                    layout="vertical"
                    margin={{ left: 4, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" {...CHART_AXIS} />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      width={200}
                      tick={{ ...CHART_AXIS.tick, fontSize: 9 }}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(v: number, name: string) =>
                        name === "drop" ? [`${v.toFixed(1)}%`, "Drop vs prior"] : [v, "Count"]
                      }
                    />
                    <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* District heatmap table */}
      {gaps?.district_heatmap && gaps.district_heatmap.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">District gap severity (heatmap)</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500">
                  <th className="p-2">District</th>
                  <th className="p-2">Screening gap</th>
                  <th className="p-2">Treatment gap</th>
                  <th className="p-2">LBW rate</th>
                  <th className="p-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {gaps.district_heatmap.slice(0, 15).map((r) => (
                  <tr key={r.district} className="border-b border-white/5">
                    <td className="p-2 font-mono text-[11px] text-zinc-300">{r.district}</td>
                    <td
                      className={cn(
                        "p-2 font-mono tabular-nums",
                        (r.screening_gap_rate ?? 0) > 0.2 ? "bg-rose-500/25" : "bg-white/5",
                      )}
                    >
                      {r.screening_gap_rate != null ? pct(r.screening_gap_rate) : "n/a"}
                    </td>
                    <td
                      className={cn(
                        "p-2 font-mono tabular-nums",
                        (r.treatment_gap_rate ?? 0) > 0.2 ? "bg-rose-500/25" : "bg-white/5",
                      )}
                    >
                      {r.treatment_gap_rate != null ? pct(r.treatment_gap_rate) : "n/a"}
                    </td>
                    <td className="p-2 font-mono tabular-nums">{r.lbw_rate != null ? pct(r.lbw_rate) : "n/a"}</td>
                    <td className="p-2 font-mono text-zinc-400">{r.severity_score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Correlation heatmap + presets */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">Preset correlations (Pearson / Spearman)</h3>
          <div className="mt-3 overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <ul className="min-w-[min(100%,22rem)] space-y-2 text-xs text-zinc-400">
              {corr?.presets
                ? Object.entries(corr.presets).map(([k, v]) => (
                    <li
                      key={k}
                      className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-white/5 pb-2 sm:flex-nowrap"
                    >
                      <span className="min-w-0 shrink text-zinc-500">{v.label}</span>
                      <span className="shrink-0 whitespace-nowrap font-mono text-zinc-200">
                        r={v.pearson?.toFixed(2) ?? "n/a"} · ρ={v.spearman?.toFixed(2) ?? "n/a"}
                      </span>
                    </li>
                  ))
                : null}
              {!corr?.presets || Object.keys(corr.presets).length === 0 ? (
                <li className="border-b border-white/5 pb-2 text-zinc-500">No preset correlations for this filter.</li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">Extended correlation matrix</h3>
          {matrixNames.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No matrix data.</p>
          ) : (
            <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[480px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500">
                    <th className="p-1" />
                    {matrixNames.map((n) => (
                      <th key={n} className="p-1 font-mono font-normal">
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixNames.map((row) => (
                    <tr key={row} className="border-b border-white/5">
                      <td className="p-1 font-mono text-zinc-500">{row}</td>
                      {matrixNames.map((col) => {
                        const r = matrixLookup.get(`${row}::${col}`);
                        const heat = correlationMatrixCellHeatClass(r, { variant: "dense" });
                        return (
                          <td key={col} className={cn("p-1 font-mono tabular-nums text-zinc-200", heat)}>
                            {r !== null && r !== undefined ? r.toFixed(2) : "n/a"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Time series */}
      {lineData.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">Time series — HIV screening & LBW (monthly)</h3>
          <p className="mt-1 text-xs text-zinc-500">Spike markers use z-score on the monthly series; MA(3) smooths noise.</p>
          <div className="mt-4 h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lineData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" {...CHART_AXIS} />
                <YAxis yAxisId="l" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} {...CHART_AXIS} />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  {...CHART_AXIS}
                />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                <Line yAxisId="l" type="monotone" dataKey="hiv" name="HIV/ANC" stroke="#22d3ee" dot={false} strokeWidth={2} />
                <Line yAxisId="l" type="monotone" dataKey="hiv_ma" name="HIV MA(3)" stroke="#67e8f9" dot={false} strokeDasharray="4 4" />
                <Line yAxisId="r" type="monotone" dataKey="lbw" name="LBW rate" stroke="#fb7185" dot={false} strokeWidth={2} />
                {ts?.spikes?.hiv_screening_indices?.map((i) =>
                  lineData[i]?.month ? (
                    <ReferenceLine
                      key={`h-${i}`}
                      yAxisId="l"
                      x={lineData[i]!.month}
                      stroke="#fbbf24"
                      strokeDasharray="3 3"
                    />
                  ) : null,
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Distributions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {dist?.pregnancy_bmi_bands ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-medium uppercase text-zinc-500">BMI bands (pregnancy identified)</h3>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist.pregnancy_bmi_bands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ ...CHART_AXIS.tick, fontSize: 9 }} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="shareOfSection" fill="#a78bfa" name="Share %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
        {dist?.pregnancy_anemia_severity ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-medium uppercase text-zinc-500">Anemia severity</h3>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist.pregnancy_anemia_severity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ ...CHART_AXIS.tick, fontSize: 9 }} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="shareOfSection" fill="#f472b6" name="Share %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
        {dist?.birth_weight_bands ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-medium uppercase text-zinc-500">Birth weight bands</h3>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist.birth_weight_bands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ ...CHART_AXIS.tick, fontSize: 9 }} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="shareOfSection" fill="#34d399" name="Share %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

      {/* Multivariate */}
      <div className="grid gap-6 lg:grid-cols-2">
        {bubbleData.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-white">Bubble — ANC × diabetes → institutional rate (size)</h3>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" dataKey="x" name="ANC" {...CHART_AXIS} />
                  <YAxis type="number" dataKey="y" name="Diabetes" {...CHART_AXIS} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} name="Inst. rate" />
                  <Tooltip {...TOOLTIP_PROPS} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={bubbleData} fill="#22d3ee" fillOpacity={0.45} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
        {ogttData.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-white">3D-style — ANC × OGTT vs institutional share (color/size)</h3>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" dataKey="x" name="ANC" {...CHART_AXIS} />
                  <YAxis type="number" dataKey="y" name="OGTT" {...CHART_AXIS} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Scatter data={ogttData} fill="#fbbf24" fillOpacity={0.5} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

      {/* Cohort retention */}
      {(data?.cohorts.retention?.length ?? 0) > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">Retention — postpartum checkup vs deliveries (by month)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(data?.cohorts.retention ?? []).map((r) => ({
                  m: r.month.slice(5),
                  rate: r.postpartum_checkup_rate,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="m" {...CHART_AXIS} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} {...CHART_AXIS} />
                <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => (v != null ? pct(v) : "n/a")} />
                <Line type="monotone" dataKey="rate" name="Checkup rate" stroke="#4ade80" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PublicHealthIntelligenceLoader({
  filters,
  filtersKey,
}: {
  filters: AnalyticsFilters;
  filtersKey: string;
}) {
  const q = useQuery({
    queryKey: ["intelligence", filtersKey],
    queryFn: ({ signal }) => getIntelligence(filters, signal),
    ...analyticsFilteredQuery,
  });

  if (q.isLoading) {
    return (
      <div className="space-y-6 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (q.isError || !q.data) {
    return <p className="text-sm text-rose-400">Could not load public health intelligence.</p>;
  }

  return <PublicHealthIntelligence data={q.data} />;
}
