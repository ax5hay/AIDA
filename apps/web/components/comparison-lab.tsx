"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { PageShell, cn } from "@aida/ui";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { getComparisonLabCatalog, getComparisonLabRun, postAiInsights } from "@/lib/api";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import type { ComparisonLabRunResponse, ComparisonMetricDto } from "@/lib/types";

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

const SAVES_KEY = "aida-comparison-lab-saves-v1";

type SavedComparison = {
  name: string;
  metricA: string;
  metricB: string;
  metricC?: string;
  savedAt: string;
};

function isNumericMetric(m: ComparisonMetricDto): boolean {
  return m.dataType === "numeric" || m.dataType === "ratio" || m.dataType === "binary";
}

function MetricSelect({
  label,
  value,
  onChange,
  metrics,
  disabledIds,
  reasonById,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  metrics: ComparisonMetricDto[];
  disabledIds: Set<string>;
  reasonById: Map<string, string>;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-200 focus:border-cyan-500/50 focus:outline-none"
      >
        <option value="">— Select —</option>
        {metrics.map((m) => {
          const dis = disabledIds.has(m.id);
          const title = dis ? reasonById.get(m.id) ?? "Not compatible" : m.label;
          return (
            <option key={m.id} value={m.id} disabled={dis} title={title}>
              {m.shortLabel} · {m.entity}
              {dis ? " (locked)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]!);
  const esc = (v: string | number) => {
    const s = String(v);
    if (s.includes(",") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k] ?? "")).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function numStats(xs: number[]) {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.length > 1 ? xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1) : 0;
  return { mean, std: Math.sqrt(v), min: sorted[0]!, max: sorted[sorted.length - 1]! };
}

function StakeholderReport({ data }: { data: ComparisonLabRunResponse }) {
  const stats = data.stats as Record<string, unknown>;
  const pearson =
    typeof stats.pearsonR === "number"
      ? stats.pearsonR
      : typeof stats.pearson === "number"
        ? stats.pearson
        : null;
  const spearman = typeof stats.spearman === "number" ? stats.spearman : null;
  const regression = stats.regression as { slope?: number; intercept?: number } | undefined;

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-300/90">Stakeholder report</p>
        <p className="mt-1 text-xs text-zinc-500">
          Plain-language summary you can read in a meeting. Technical detail stays in the chart and raw stats below.
        </p>
      </div>

      <section className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
        <h3 className="text-sm font-medium text-amber-100/90">Executive summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{data.insight}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <h3 className="text-xs font-medium uppercase text-zinc-500">What was compared</h3>
          <dl className="mt-3 space-y-2 text-sm text-zinc-300">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Metric A</dt>
              <dd className="text-right font-mono text-xs text-cyan-300/90">{data.metricA.label}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Metric B</dt>
              <dd className="text-right font-mono text-xs text-cyan-300/90">{data.metricB.label}</dd>
            </div>
            {data.metricC ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Metric C</dt>
                <dd className="text-right font-mono text-xs text-cyan-300/90">{data.metricC.label}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-white/5 pt-2">
              <dt className="text-zinc-500">Assessments used</dt>
              <dd className="font-mono text-white">{data.nRows}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Visualization</dt>
              <dd className="font-mono text-xs text-zinc-400">{data.chartKind.replace(/_/g, " ")}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <h3 className="text-xs font-medium uppercase text-zinc-500">Key numbers</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            {pearson !== null ? (
              <li>
                Pearson correlation: <span className="font-mono text-zinc-200">{pearson.toFixed(4)}</span>
              </li>
            ) : null}
            {spearman !== null ? (
              <li>
                Spearman correlation: <span className="font-mono text-zinc-200">{spearman.toFixed(4)}</span>
              </li>
            ) : null}
            {regression && Number.isFinite(regression.slope) ? (
              <li>
                Line slope (OLS): <span className="font-mono text-zinc-200">{regression.slope!.toFixed(4)}</span>
              </li>
            ) : null}
            {data.contingency && data.contingency.pValue != null ? (
              <li>
                Chi-square p-value:{" "}
                <span className="font-mono text-zinc-200">{data.contingency.pValue.toFixed(4)}</span> (categories are
                independent if p is large)
              </li>
            ) : null}
            {!pearson && !spearman && !regression?.slope && !data.contingency ? (
              <li className="text-zinc-600">Open “Raw stats” below for full figures.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-500">
        <p className="font-medium text-zinc-400">Reading the chart</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Scatter or bubble: each dot is one assessment in your current date/district filters — not a person-level
            longitudinal trace.
          </li>
          <li>Bars or lines: axis labels match the metrics above; hover tooltips show exact values.</li>
          <li>Use Export CSV when stakeholders ask for the underlying rows.</li>
        </ul>
      </section>
    </div>
  );
}

/** Extra labelled figures: distribution summaries, sample sizes, and derived scalar views */
function ComparisonLabDerivedFigures({ data }: { data: ComparisonLabRunResponse }) {
  const kind = data.chartKind;
  const stats = data.stats as Record<string, unknown>;
  const pearsonR =
    typeof stats.pearsonR === "number"
      ? stats.pearsonR
      : typeof stats.pearson === "number"
        ? stats.pearson
        : null;

  if ((kind === "scatter_regression" || kind === "bubble_3d") && data.scatter?.length) {
    const pts = data.scatter;
    const sx = numStats(pts.map((p) => p.x));
    const sy = numStats(pts.map((p) => p.y));
    const sz =
      kind === "bubble_3d" && pts.some((p) => p.z != null) ? numStats(pts.map((p) => p.z ?? 0)) : null;
    const meanRows = [
      { label: data.metricA.shortLabel, value: sx?.mean ?? 0 },
      { label: data.metricB.shortLabel, value: sy?.mean ?? 0 },
      ...(sz && data.metricC ? [{ label: data.metricC.shortLabel, value: sz.mean }] : []),
    ];
    const cov =
      pts.length > 1 && sx && sy
        ? pts.reduce((s, p) => s + (p.x - sx.mean) * (p.y - sy.mean), 0) / (pts.length - 1)
        : null;

    return (
      <div className="space-y-6 pt-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/90">
            Derived figures — distribution summary
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Computed in the browser from the same points as the main chart. Covariance uses sample covariance (n−1).
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 w-full min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase text-zinc-500">Means (magnitude comparison)</p>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={meanRows} margin={{ left: 4, right: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" {...CHART_AXIS} interval={0} angle={-25} textAnchor="end" height={64} />
                <YAxis {...CHART_AXIS} />
                <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => [v.toFixed(2), "Mean"]} />
                <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Mean" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <p className="text-[10px] font-medium uppercase text-zinc-500">Numeric summary</p>
            <table className="mt-3 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-500">
                  <th className="py-1 pr-2">Metric</th>
                  <th className="py-1 pr-2">Min</th>
                  <th className="py-1 pr-2">Max</th>
                  <th className="py-1 pr-2">Mean</th>
                  <th className="py-1">Std dev</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-white/5">
                  <td className="py-1.5 font-mono text-[10px] text-cyan-400/90">{data.metricA.shortLabel}</td>
                  <td className="font-mono">{sx?.min.toFixed(2)}</td>
                  <td className="font-mono">{sx?.max.toFixed(2)}</td>
                  <td className="font-mono">{sx?.mean.toFixed(2)}</td>
                  <td className="font-mono">{sx?.std.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1.5 font-mono text-[10px] text-fuchsia-400/90">{data.metricB.shortLabel}</td>
                  <td className="font-mono">{sy?.min.toFixed(2)}</td>
                  <td className="font-mono">{sy?.max.toFixed(2)}</td>
                  <td className="font-mono">{sy?.mean.toFixed(2)}</td>
                  <td className="font-mono">{sy?.std.toFixed(2)}</td>
                </tr>
                {sz && data.metricC ? (
                  <tr>
                    <td className="py-1.5 font-mono text-[10px] text-emerald-400/90">{data.metricC.shortLabel}</td>
                    <td className="font-mono">{sz.min.toFixed(2)}</td>
                    <td className="font-mono">{sz.max.toFixed(2)}</td>
                    <td className="font-mono">{sz.mean.toFixed(2)}</td>
                    <td className="font-mono">{sz.std.toFixed(2)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {cov != null && Number.isFinite(cov) ? (
              <p className="mt-3 text-[11px] text-zinc-500">
                Sample covariance (A,B): <span className="font-mono text-zinc-300">{cov.toFixed(4)}</span>
              </p>
            ) : null}
          </div>
        </div>
        {pearsonR != null && Number.isFinite(pearsonR) ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10px] font-medium uppercase text-zinc-500">Pearson r (linear association)</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-y-0 w-px bg-white/40"
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                />
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-rose-500/80 via-zinc-600 to-emerald-500/80"
                  style={{
                    left: `${((pearsonR + 1) / 2) * 100}%`,
                    width: "6px",
                    marginLeft: "-3px",
                  }}
                />
              </div>
              <span className="font-mono text-sm tabular-nums text-cyan-300/90">{pearsonR.toFixed(3)}</span>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">−1 (negative) ← → +1 (positive). Marker shows r.</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (kind === "line_trend" && data.lineSeries?.length) {
    const chartData = data.lineSeries.map((p) => ({
      period: p.period.length > 12 ? p.period.slice(0, 10) + "…" : p.period,
      yMean: p.yMean,
      n: p.n,
    }));
    return (
      <div className="space-y-4 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/90">
          Derived figures — trend & sample depth
        </p>
        <div className="h-72 w-full min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="mb-1 text-[10px] text-zinc-500">Mean value (line) and assessments per period (shaded area)</p>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={chartData} margin={{ left: 4, right: 12, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" {...CHART_AXIS} angle={-22} textAnchor="end" height={52} />
              <YAxis yAxisId="left" {...CHART_AXIS} />
              <YAxis yAxisId="right" orientation="right" {...CHART_AXIS} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="n"
                name="n per period"
                fill="rgba(167,139,250,0.25)"
                stroke="#a78bfa"
                strokeWidth={1}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="yMean"
                name="Mean"
                stroke="#22d3ee"
                strokeWidth={2}
                dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (kind === "bar_groups" && data.barGroups?.length) {
    const rows = data.barGroups.map((g) => ({
      name: g.key.slice(0, 18),
      mean: g.mean,
      n: g.n,
      std: g.std,
    }));
    return (
      <div className="space-y-4 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/90">
          Derived figures — category statistics
        </p>
        <div className="h-64 w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <ResponsiveContainer width={Math.max(400, rows.length * 72)} height="100%">
            <BarChart data={rows} margin={{ left: 4, right: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" {...CHART_AXIS} interval={0} angle={-30} textAnchor="end" height={70} />
              <YAxis {...CHART_AXIS} />
              <Tooltip
                {...TOOLTIP_PROPS}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]?.payload as { mean: number; n: number; std: number };
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-xs text-zinc-200">
                      <p className="font-mono text-[10px] text-zinc-500">Mean {p.mean.toFixed(2)}</p>
                      <p>n = {p.n}</p>
                      <p>σ = {p.std.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="mean" fill="#34d399" name="Mean" radius={[4, 4, 0, 0]}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={`hsl(${160 + (i * 15) % 80}, 55%, 45%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (kind === "contingency_heatmap" && data.contingency) {
    const { aKeys, bKeys, counts } = data.contingency;
    const rowTotals = aKeys.map((_, i) => counts[i]!.reduce((s, v) => s + v, 0));
    const colTotals = bKeys.map((_, j) => counts.reduce((s, row) => s + (row[j] ?? 0), 0));
    const grand = rowTotals.reduce((a, b) => a + b, 0) || 1;
    const rowBar = aKeys.map((a, i) => ({
      label: a.slice(0, 14),
      pct: (rowTotals[i]! / grand) * 100,
    }));
    return (
      <div className="space-y-4 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/90">
          Derived figures — margin distributions
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-52 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[10px] text-zinc-500">Row margin (% of total count)</p>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={rowBar} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" {...CHART_AXIS} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" width={88} {...CHART_AXIS} tick={{ fontSize: 9 }} />
                <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => [`${v.toFixed(1)}%`, "Share"]} />
                <Bar dataKey="pct" fill="#22d3ee" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Column totals (for balance check)</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[10px]">
              {bKeys.map((b, j) => (
                <li key={b}>
                  {b.slice(0, 20)}: <span className="text-zinc-200">{colTotals[j]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function RunCharts({ data }: { data: ComparisonLabRunResponse }) {
  const kind = data.chartKind;

  if (kind === "bubble_3d" && data.scatter?.length) {
    const bubble = data.scatter.map((p) => ({ ...p, x: p.x, y: p.y, z: p.z ?? 0 }));
    return (
      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" dataKey="x" name={data.metricA.shortLabel} {...CHART_AXIS} />
            <YAxis type="number" dataKey="y" name={data.metricB.shortLabel} {...CHART_AXIS} />
            <ZAxis type="number" dataKey="z" range={[40, 400]} name={data.metricC?.shortLabel ?? "Z"} />
            <Tooltip {...TOOLTIP_PROPS} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={bubble} fill="#22d3ee" fillOpacity={0.45} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "line_trend" && data.lineSeries?.length) {
    const chartData = data.lineSeries.map((p) => ({ period: p.period, yMean: p.yMean, n: p.n }));
    return (
      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="period" {...CHART_AXIS} angle={-20} textAnchor="end" height={52} />
            <YAxis {...CHART_AXIS} />
            <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => [v.toFixed(2), "Mean"]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
            <Line type="monotone" dataKey="yMean" name="Mean (per month)" stroke="#22d3ee" strokeWidth={2} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "bar_groups" && data.barGroups?.length) {
    const chartData = data.barGroups.map((g) => ({ name: g.key.slice(0, 20), mean: g.mean, n: g.n }));
    return (
      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 4, right: 8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" {...CHART_AXIS} interval={0} angle={-25} textAnchor="end" height={64} />
            <YAxis {...CHART_AXIS} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Bar dataKey="mean" fill="#a78bfa" name="Mean" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "contingency_heatmap" && data.contingency) {
    const { aKeys, bKeys, counts } = data.contingency;
    const max = Math.max(1, ...counts.flat());
    return (
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-[320px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-zinc-500">
              <th className="p-2" />
              {bKeys.map((b) => (
                <th key={b} className="p-2 font-mono">
                  {b.slice(0, 12)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aKeys.map((a, i) => (
              <tr key={a} className="border-b border-white/5">
                <td className="p-2 font-mono text-zinc-400">{a.slice(0, 14)}</td>
                {bKeys.map((_, j) => {
                  const v = counts[i]?.[j] ?? 0;
                  const heat = v / max;
                  return (
                    <td
                      key={j}
                      className="p-2 font-mono tabular-nums text-zinc-200"
                      style={{ background: `rgba(56,189,248,${0.08 + heat * 0.45})` }}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /** scatter_regression */
  if (data.scatter?.length) {
    const reg = data.stats.regression as { slope: number; intercept: number } | undefined;
    const xs = data.scatter.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const lineData =
      reg && Number.isFinite(reg.slope)
        ? [
            { x: minX, y: reg.slope * minX + reg.intercept },
            { x: maxX, y: reg.slope * maxX + reg.intercept },
          ]
        : [];
    const scatter = data.scatter.map((p) => ({ x: p.x, y: p.y, id: p.assessmentId.slice(0, 8) }));
    return (
      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" dataKey="x" name={data.metricA.shortLabel} {...CHART_AXIS} />
            <YAxis type="number" dataKey="y" name={data.metricB.shortLabel} {...CHART_AXIS} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Scatter name="Assessments" data={scatter} fill="#22d3ee" fillOpacity={0.45} />
            {lineData.length === 2 ? (
              <Line
                name="OLS fit"
                data={lineData}
                dataKey="y"
                stroke="#f472b6"
                strokeWidth={2}
                dot={false}
                type="linear"
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return <p className="text-sm text-zinc-500">No chart points for current filters.</p>;
}

export function ComparisonLabPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();
  const [metricA, setMetricA] = useState("");
  const [metricB, setMetricB] = useState("");
  const [metricC, setMetricC] = useState("");
  const [runNonce, setRunNonce] = useState(0);

  const catalog = useQuery({
    queryKey: ["comparison-lab-catalog"],
    queryFn: ({ signal }) => getComparisonLabCatalog(signal),
    staleTime: 60 * 60_000,
  });

  const matrix = catalog.data?.compatibility;
  const metrics = catalog.data?.metrics ?? [];

  const reasonB = useMemo(() => {
    const map = new Map<string, string>();
    if (!matrix || !metricA) return map;
    for (const m of metrics) {
      const r = matrix[metricA]?.[m.id];
      if (r && !r.ok && r.reason) map.set(m.id, r.reason);
    }
    return map;
  }, [matrix, metricA, metrics]);

  const disabledB = useMemo(() => {
    const s = new Set<string>();
    if (!matrix || !metricA) return s;
    for (const m of metrics) {
      if (m.id === metricA) continue;
      if (!matrix[metricA]?.[m.id]?.ok) s.add(m.id);
    }
    return s;
  }, [matrix, metricA, metrics]);

  const reasonC = useMemo(() => {
    const map = new Map<string, string>();
    if (!matrix || !metricA || !metricB) return map;
    for (const m of metrics) {
      const r1 = matrix[metricA]?.[m.id];
      const r2 = matrix[metricB]?.[m.id];
      if (m.id === metricA || m.id === metricB) {
        map.set(m.id, "Select a different metric.");
        continue;
      }
      if (!isNumericMetric(m)) {
        map.set(m.id, "Not compatible: Three-variable view requires numeric (or ratio) metrics.");
        continue;
      }
      if (r1 && !r1.ok && r1.reason) map.set(m.id, `Metric C: ${r1.reason}`);
      else if (r2 && !r2.ok && r2.reason) map.set(m.id, `Metric C: ${r2.reason}`);
    }
    return map;
  }, [matrix, metricA, metricB, metrics]);

  const disabledC = useMemo(() => {
    const s = new Set<string>();
    if (!metricA || !metricB) {
      metrics.forEach((m) => s.add(m.id));
      return s;
    }
    for (const m of metrics) {
      if (m.id === metricA || m.id === metricB) {
        s.add(m.id);
        continue;
      }
      if (!isNumericMetric(m)) {
        s.add(m.id);
        continue;
      }
      if (!matrix?.[metricA]?.[m.id]?.ok || !matrix?.[metricB]?.[m.id]?.ok) s.add(m.id);
    }
    return s;
  }, [matrix, metricA, metricB, metrics]);

  const run = useQuery({
    queryKey: ["comparison-lab-run", filtersKey, metricA, metricB, metricC, runNonce],
    queryFn: ({ signal }) =>
      getComparisonLabRun(
        { metricA, metricB, metricC: metricC || undefined, filters },
        signal,
      ),
    enabled: runNonce > 0 && !!metricA && !!metricB,
    ...analyticsFilteredQuery,
  });

  const aiMut = useMutation({
    mutationFn: () =>
      postAiInsights({
        page: "comparison-lab",
        filters,
        run: run.data,
      }),
  });
  const aiText = aiMut.data?.text ?? null;

  const canRun = !!metricA && !!metricB && matrix?.[metricA]?.[metricB]?.ok;

  const loadSaves = useCallback((): SavedComparison[] => {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      if (!raw) return [];
      const p = JSON.parse(raw) as SavedComparison[];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }, []);

  const [saves, setSaves] = useState<SavedComparison[]>([]);
  const refreshSaves = useCallback(() => setSaves(loadSaves()), [loadSaves]);
  useEffect(() => {
    refreshSaves();
  }, [refreshSaves]);

  const saveCurrent = () => {
    if (!canRun) return;
    const name = window.prompt("Name this comparison");
    if (!name?.trim()) return;
    const next: SavedComparison = {
      name: name.trim(),
      metricA,
      metricB,
      metricC: metricC || undefined,
      savedAt: new Date().toISOString(),
    };
    const list = [next, ...loadSaves()].slice(0, 20);
    localStorage.setItem(SAVES_KEY, JSON.stringify(list));
    refreshSaves();
  };

  const applySave = (s: SavedComparison) => {
    setMetricA(s.metricA);
    setMetricB(s.metricB);
    setMetricC(s.metricC ?? "");
    setRunNonce((n) => n + 1);
  };

  return (
    <PageShell
      title="Comparison Lab"
      eyebrow="Intelligent analysis assistant"
      subtitle="Choose metrics A and B (optional C for a three-variable bubble). The engine only allows linked entities, matching aggregation levels, and statistically meaningful pairings — then picks the right visualization."
      explainer={{
        what: "A guided comparator for any two (or three) compatible numeric metrics in the database.",
        does: "Produces a chart, statistical summary, stakeholder-ready narrative, and exports — without expecting readers to interpret raw JSON.",
      }}
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {catalog.isLoading ? (
        <p className="text-sm text-zinc-500">Loading metric catalog…</p>
      ) : catalog.isError ? (
        <p className="text-sm text-rose-400">Could not load comparison catalog.</p>
      ) : (
        <div className="space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-medium text-white">Metric selection</h2>
            <p className="mt-1 text-xs text-zinc-500">
              After you pick Metric A, incompatible metrics stay locked. Hover disabled options (where supported) for the
              reason, or see the compatibility matrix from the API.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <MetricSelect
                id="m-a"
                label="Metric A"
                value={metricA}
                onChange={(v) => {
                  setMetricA(v);
                  setMetricB("");
                  setMetricC("");
                }}
                metrics={metrics}
                disabledIds={new Set()}
                reasonById={new Map()}
              />
              <MetricSelect
                id="m-b"
                label="Metric B"
                value={metricB}
                onChange={(v) => {
                  setMetricB(v);
                  setMetricC("");
                }}
                metrics={metrics}
                disabledIds={disabledB}
                reasonById={reasonB}
              />
              <MetricSelect
                id="m-c"
                label="Metric C (optional)"
                value={metricC}
                onChange={setMetricC}
                metrics={metrics}
                disabledIds={disabledC}
                reasonById={reasonC}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canRun}
                onClick={() => setRunNonce((n) => n + 1)}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                  canRun
                    ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/40"
                    : "cursor-not-allowed border-white/10 text-zinc-600",
                )}
              >
                Run analysis
              </button>
              <button
                type="button"
                disabled={!run.data}
                onClick={() => run.data && exportJson(`comparison-lab-${filtersKey}.json`, run.data)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
              >
                Export JSON
              </button>
              <button
                type="button"
                disabled={!run.data?.scatter?.length}
                onClick={() => {
                  const s = run.data?.scatter;
                  if (!s?.length) return;
                  exportCsv(`comparison-lab-points.csv`, s.map((p) => ({ assessmentId: p.assessmentId, x: p.x, y: p.y, z: p.z ?? "" })));
                }}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
              >
                Export CSV (points)
              </button>
              <button
                type="button"
                disabled={!canRun}
                onClick={saveCurrent}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
              >
                Save comparison
              </button>
            </div>
          </div>

          {saves.length === 0 ? null : (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Saved (this browser)</p>
              <ul className="mt-2 space-y-2">
                {saves.map((s) => (
                  <li key={s.savedAt + s.name}>
                    <button
                      type="button"
                      className="text-left text-sm text-cyan-300/90 hover:underline"
                      onClick={() => applySave(s)}
                    >
                      {s.name}
                    </button>
                    <span className="ml-2 text-xs text-zinc-600">
                      {s.metricA} × {s.metricB}
                      {s.metricC ? ` × ${s.metricC}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {run.isLoading ? <p className="text-sm text-zinc-500">Computing…</p> : null}
          {run.isError ? (
            <p className="text-sm text-rose-400">{(run.error as Error).message ?? "Run failed."}</p>
          ) : null}
          {run.data ? (
            <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-400/90">Result</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    Chart: <span className="text-zinc-300">{run.data.chartKind}</span> · Rows scanned:{" "}
                    {run.data.nRows}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">{run.data.insight}</p>
                </div>
                <button
                  type="button"
                  onClick={() => aiMut.mutate()}
                  disabled={aiMut.isPending}
                  className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-2 text-xs font-medium text-violet-200 disabled:opacity-40"
                >
                  {aiMut.isPending ? "AI…" : "AI explain relationship"}
                </button>
              </div>
              {aiText ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 font-sans text-xs text-zinc-300">
                  {aiText}
                </pre>
              ) : null}
              <StakeholderReport data={run.data} />
              <ComparisonLabDerivedFigures data={run.data} />
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-400/80">
                  Primary visualization
                </p>
                <RunCharts data={run.data} />
              </div>
              <details className="text-xs text-zinc-500">
                <summary className="cursor-pointer text-zinc-400">Raw stats</summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px]">
                  {JSON.stringify(run.data.stats, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
