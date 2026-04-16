"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { AnalyticsFilters } from "@/lib/query-params";
import {
  getClinicalCrossSection,
  getCorrelations,
  getDistrictRollup,
  getOverview,
} from "@/lib/api";
import { cn } from "@aida/ui";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { PublicHealthIntelligenceLoader } from "@/components/public-health-intelligence";

const CHART_AXIS = { tick: { fill: "#a1a1aa", fontSize: 11 } };

/** Recharts default tooltip inherits light text on dark bg — force readable labels */
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

function pct(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  return `${(v * 100).toFixed(digits)}%`;
}

export function AnalyticsSuite({
  filters,
  filtersKey,
}: {
  filters: AnalyticsFilters;
  filtersKey: string;
}) {
  const overview = useQuery({
    queryKey: ["overview", filtersKey],
    queryFn: ({ signal }) => getOverview(filters, signal),
    ...analyticsFilteredQuery,
  });
  const cross = useQuery({
    queryKey: ["clinical-cross-section", filtersKey],
    queryFn: ({ signal }) => getClinicalCrossSection(filters, signal),
    ...analyticsFilteredQuery,
  });
  const corr = useQuery({
    queryKey: ["correlations", filtersKey],
    queryFn: ({ signal }) => getCorrelations(filters, signal),
    ...analyticsFilteredQuery,
  });
  const rollup = useQuery({
    queryKey: ["district-rollup", filtersKey],
    queryFn: ({ signal }) => getDistrictRollup(filters, signal),
    ...analyticsFilteredQuery,
  });

  const d = overview.data;
  const corpus = d?.corpus;
  const sr = d?.kpis.screening_rates;
  const funnel = d?.funnel;

  const districtScreeningCompare =
    rollup.data?.slice(0, 10).map((r) => {
      const anc = r.anc_registered_total;
      const hivR = anc > 0 ? r.hiv_tested_total / anc : 0;
      const hgbR = anc > 0 ? r.hemoglobin_4x_total / anc : 0;
      const label = r.district.length > 18 ? `${r.district.slice(0, 16)}…` : r.district;
      return {
        district: label,
        hiv_rate_pct: hivR * 100,
        hgb_4x_rate_pct: hgbR * 100,
        anc_sum: anc,
      };
    }) ?? [];

  const funnelBars =
    funnel && d
      ? [
          { stage: "Preconception — identified (sum)", value: funnel.preconception.identified_total },
          { stage: "Preconception — managed (sum)", value: funnel.preconception.managed_total },
          { stage: "Pregnancy — ANC registered", value: funnel.pregnancy.registered_total },
          { stage: "Outcomes — live births", value: funnel.outcomes.live_births },
        ]
      : [];

  const matrix = corr.data?.matrix ?? [];
  const names = [...new Set(matrix.flatMap((c) => [c.row, c.col]))].sort((a, b) =>
    a.localeCompare(b),
  );
  const matrixLookup = new Map(matrix.map((cell) => [`${cell.row}::${cell.col}`, cell.r]));

  const xsAncHgb =
    cross.data?.ancHgb.map((p) => ({
      x: p.total_anc_registered,
      y: p.hemoglobin_tested_4_times,
      id: p.assessmentId,
    })) ?? [];

  const xsAncHiv =
    cross.data?.ancHiv.map((p) => ({
      x: p.total_anc_registered,
      y: p.hiv_tested,
      id: p.assessmentId,
    })) ?? [];

  const xsPregAnemiaLive =
    cross.data?.pregAnemiaVsLive.map((p) => ({
      x: p.pregnancy_anemia_screened,
      y: p.live_births,
      id: p.assessmentId,
    })) ?? [];

  const xsPreAnemia =
    cross.data?.preconceptionAnemiaIdVsManaged.map((p) => ({
      x: p.preconception_anemia_identified,
      y: p.preconception_anemia_managed,
      id: p.assessmentId,
    })) ?? [];

  return (
    <div className="min-w-0 space-y-14">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/30 to-transparent p-5 sm:p-6"
      >
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-indigo-300/90">
          Analytics overview (full corpus in filter)
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          This page is not limited to one clinical chapter: it pulls the same filtered{" "}
          <strong className="font-medium text-zinc-200">Facility assessment</strong> rows used everywhere else — all linked
          section tables contribute to intelligence, rollups, scatters, and the matrix below. Percentages in the evidence
          panel use explicit denominators (Σ ANC or live births) as labeled.
        </p>
        {corpus && d ? (
          <ul className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <span className="text-zinc-600">Facilities · districts · assessments:</span>{" "}
              <span className="font-mono text-zinc-300">
                {d.meta.facilityCount} · {d.meta.districtCount} · {d.meta.assessmentCount}
              </span>
            </li>
            <li>
              <span className="text-zinc-600">Σ ANC registered (pooled):</span>{" "}
              <span className="font-mono text-zinc-300">{corpus.ancNumerators.denominator_total_anc_registered}</span>
            </li>
            <li>
              <span className="text-zinc-600">Districts in rollup chart:</span>{" "}
              <span className="font-mono text-zinc-300">{rollup.data?.length ?? "…"}</span>
            </li>
            <li>
              <span className="text-zinc-600">Live births / maternal deaths (sums):</span>{" "}
              <span className="font-mono text-zinc-300">
                {corpus.outcomeDenominators.live_births} / {corpus.outcomeDenominators.maternal_deaths}
              </span>
            </li>
          </ul>
        ) : null}
      </motion.section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
          Module A — Public health intelligence
        </h2>
        <p className="max-w-3xl text-sm text-zinc-500">
          <span className="font-medium text-zinc-300">What it is:</span> Deterministic pipelines (gaps, cohorts,
          correlations, anomalies) built from all section fields in the filter.{" "}
          <span className="font-medium text-zinc-300">What it does:</span> Surfaces programme-wide patterns and
          district-level heat without an LLM.
        </p>
        <PublicHealthIntelligenceLoader filters={filters} filtersKey={filtersKey} />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
      >
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-400/90">
          Module B — Evidence panel (rule-based KPIs)
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          <span className="font-medium text-zinc-300">What it is:</span> Aggregated KPI cards and thresholds.{" "}
          <span className="font-medium text-zinc-300">What it does:</span> Shows ANC screening numerators over{" "}
          <code className="rounded bg-white/5 px-1 font-mono text-[13px] text-zinc-300">total_anc_registered</code>,
          mortality and delivery mix from{" "}
          <code className="rounded bg-white/5 px-1 font-mono text-[13px] text-zinc-300">delivery_and_outcomes</code>, and
          management gaps from identified vs managed cohort tables. No LLM; no synthetic rows.
        </p>
        {overview.isLoading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        ) : d ? (
          <>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Assessments in filter" value={String(d.meta.assessmentCount)} hint="Row count" />
              <MetricCard
                label="HIV / ANC"
                value={pct(sr?.screening_rate_hiv)}
                denominator={`${d.corpus.ancNumerators.hiv_tested} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
                hint="hiv_tested ÷ Σ total_anc"
              />
              <MetricCard
                label="Hb ×4 / ANC"
                value={pct(sr?.screening_rate_hgb_4x)}
                denominator={`${d.corpus.ancNumerators.hemoglobin_tested_4_times} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
                hint="hemoglobin_tested_4_times ÷ Σ ANC"
              />
              <MetricCard
                label="BP / ANC"
                value={pct(sr?.screening_rate_bp)}
                denominator={`${d.corpus.ancNumerators.blood_pressure_checked} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="CBC / ANC"
                value={pct(sr?.screening_rate_cbc)}
                denominator={`${d.corpus.ancNumerators.cbc_tested} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="OGTT / ANC"
                value={pct(sr?.screening_rate_ogtt)}
                denominator={`${d.corpus.ancNumerators.gdm_ogtt_tested} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="Syphilis / ANC"
                value={pct(sr?.screening_rate_syphilis)}
                denominator={`${d.corpus.ancNumerators.syphilis_tested} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="TSH / ANC"
                value={pct(sr?.screening_rate_tsh)}
                denominator={`${d.corpus.ancNumerators.thyroid_tsh_tested} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="Urine / ANC"
                value={pct(sr?.screening_rate_urine)}
                denominator={`${d.corpus.ancNumerators.urine_routine_microscopy} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="Blood grouping / ANC"
                value={pct(sr?.screening_rate_blood_grouping)}
                denominator={`${d.corpus.ancNumerators.blood_grouping} / ${d.corpus.ancNumerators.denominator_total_anc_registered}`}
              />
              <MetricCard
                label="Maternal deaths / live births"
                value={d.kpis.mortality_rate_maternal_per_live_birth?.toFixed(5) ?? "n/a"}
                denominator={`${d.corpus.outcomeDenominators.maternal_deaths} / ${d.corpus.outcomeDenominators.live_births}`}
                hint="rate = maternal_deaths ÷ live_births"
              />
              <MetricCard
                label="Early neonatal deaths / live births"
                value={d.kpis.early_neonatal_mortality_rate_per_live_birth?.toFixed(5) ?? "n/a"}
                denominator={`${d.corpus.outcomeDenominators.early_neonatal_deaths_lt_24hrs} / ${d.corpus.outcomeDenominators.live_births}`}
              />
              <MetricCard label="Institutional delivery ratio" value={pct(d.kpis.institutional_delivery_ratio)} />
              <MetricCard
                label="LBW / live births"
                value={pct(d.kpis.lbw_rate)}
                denominator={`${d.corpus.outcomeDenominators.lbw_lt_2500g} / ${d.corpus.outcomeDenominators.live_births}`}
                hint="lbw_lt_2500g ÷ live_births"
              />
              <MetricCard
                label="Preterm / live births"
                value={pct(d.kpis.preterm_rate)}
                denominator={`${d.corpus.outcomeDenominators.preterm_births_lt_37_weeks} / ${d.corpus.outcomeDenominators.live_births}`}
              />
              <MetricCard
                label="Validation flags (rows)"
                value={String(d.validation.issues.length)}
                hint="Logical checks on source sections"
              />
            </ul>
            {d.alerts.length > 0 ? (
              <p className="mt-4 text-xs text-amber-200/80">
                {d.alerts.length} threshold alert{d.alerts.length === 1 ? "" : "s"} active — see Program overview for
                detail.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-rose-400">Could not load overview metrics.</p>
        )}
      </motion.section>

      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
        Module C — District rollup (all facilities rolled to district)
      </p>
      {/* District: same denominator (ANC) for two screening rates */}
      <ChartCard
        title="District screening intensity (ANC-based)"
        subtitle="Per district: HIV tests and Hb×4 tests as a share of summed total_anc_registered — comparable because the denominator is the same field."
      >
        {rollup.isLoading ? (
          <Skeleton />
        ) : districtScreeningCompare.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtScreeningCompare} margin={{ left: 4, right: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="district" {...CHART_AXIS} interval={0} angle={-28} textAnchor="end" height={56} />
                <YAxis
                  {...CHART_AXIS}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "% of summed ANC", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 11 }}
                />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  formatter={(value: number, name: string) => [
                    `${Number(value).toFixed(1)}%`,
                    name === "hiv_rate_pct" ? "HIV / Σ ANC (district)" : "Hb×4 / Σ ANC (district)",
                  ]}
                  labelFormatter={(_, items) => {
                    const row = items?.[0]?.payload as { anc_sum?: number; district?: string } | undefined;
                    const bits = [row?.district, row?.anc_sum != null ? `Σ ANC ${row.anc_sum}` : null].filter(Boolean);
                    return bits.join(" · ");
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                  formatter={(v) =>
                    v === "hiv_rate_pct" ? "HIV screening (÷ Σ ANC)" : "Hb×4 screening (÷ Σ ANC)"
                  }
                />
                <Bar dataKey="hiv_rate_pct" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="hgb_4x_rate_pct" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Funnel as bar — explicit aggregate totals */}
      <ChartCard
        title="Reporting funnel (aggregated totals)"
        subtitle="Sums across all filtered monthly facility rows — not a traced patient cohort. Stages use different section tables; interpret as workload volume, not strict drop-off."
      >
        {funnelBars.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" {...CHART_AXIS} />
                <YAxis type="category" dataKey="stage" width={220} {...CHART_AXIS} tick={{ fontSize: 10 }} />
                <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => [v, "Count"]} />
                <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
        Module D — Paired-field scatter plots (assessment-level)
      </p>
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="ANC volume vs Hb×4 capture (same row)"
          subtitle="pregnant_women_registered_and_screened: hemoglobin_tested_4_times vs total_anc_registered per assessment."
        >
          {cross.isLoading ? (
            <Skeleton />
          ) : xsAncHgb.length === 0 ? (
            <Empty />
          ) : (
            <ScatterPlot
              data={xsAncHgb}
              xLabel="total_anc_registered"
              yLabel="hemoglobin_tested_4_times"
              color="#22d3ee"
            />
          )}
        </ChartCard>

        <ChartCard
          title="ANC volume vs HIV tests (same row)"
          subtitle="Same section: hiv_tested vs total_anc_registered — both tied to the ANC registration denominator."
        >
          {xsAncHiv.length === 0 ? (
            <Empty />
          ) : (
            <ScatterPlot data={xsAncHiv} xLabel="total_anc_registered" yLabel="hiv_tested" color="#f472b6" />
          )}
        </ChartCard>

        <ChartCard
          title="Pregnancy anemia (screened) vs live births"
          subtitle="pregnant_women_identified (severe+moderate anemia counts) vs delivery_and_outcomes.live_births — exploratory workload vs output."
        >
          {xsPregAnemiaLive.length === 0 ? (
            <Empty />
          ) : (
            <ScatterPlot
              data={xsPregAnemiaLive}
              xLabel="severe + moderate anemia (screened)"
              yLabel="live_births"
              color="#34d399"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Preconception anemia: identified vs managed"
          subtitle="Same anemia fields on preconception_women_identified vs preconception_women_managed — paired cohort management."
        >
          {xsPreAnemia.length === 0 ? (
            <Empty />
          ) : (
            <ScatterPlot
              data={xsPreAnemia}
              xLabel="anemia identified (severe+moderate)"
              yLabel="anemia managed (severe+moderate)"
              color="#fbbf24"
            />
          )}
        </ChartCard>
      </section>

      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
        Module E — Compact correlation matrix (engineered series)
      </p>
      <ChartCard
        title="Engineered-series correlation matrix"
        subtitle="Same Pearson matrix as Correlations: anemia_pre, bmi_pre, anemia_preg, bmi_preg, live_births — comparable cohort constructs from the analytics engine."
      >
        {corr.isLoading ? (
          <Skeleton />
        ) : names.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500">
                  <th className="p-2 font-medium" />
                  {names.map((n) => (
                    <th key={n} className="p-2 font-mono text-[10px] font-normal text-zinc-400">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {names.map((row) => (
                  <tr key={row} className="border-b border-white/5">
                    <td className="p-2 font-mono text-[10px] text-zinc-400">{row}</td>
                    {names.map((col) => {
                      const r = matrixLookup.get(`${row}::${col}`);
                      const heat =
                        r === null || r === undefined
                          ? "bg-transparent"
                          : r > 0.5
                            ? "bg-emerald-500/35"
                            : r > 0.2
                              ? "bg-emerald-500/18"
                              : r < -0.5
                                ? "bg-rose-500/35"
                                : r < -0.2
                                  ? "bg-rose-500/18"
                                  : "bg-white/5";
                      return (
                        <td key={col} className={cn("p-2 font-mono tabular-nums text-zinc-200", heat)}>
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
      </ChartCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  denominator,
}: {
  label: string;
  value: string;
  hint?: string;
  denominator?: string;
}) {
  return (
    <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-200">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <p className="mt-1 font-mono text-base text-white">{value}</p>
      {denominator ? <p className="mt-1 font-mono text-[10px] text-zinc-500">{denominator}</p> : null}
      {hint ? <p className="mt-1 text-[10px] text-zinc-600">{hint}</p> : null}
    </li>
  );
}

function ScatterPlot({
  data,
  xLabel,
  yLabel,
  color,
}: {
  data: Array<{ x: number; y: number; id: string }>;
  xLabel: string;
  yLabel: string;
  color: string;
}) {
  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" dataKey="x" name={xLabel} {...CHART_AXIS} label={{ value: xLabel, position: "bottom", fill: "#71717a", fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name={yLabel} {...CHART_AXIS} width={44} label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }} />
          <ZAxis range={[36, 36]} />
          <Tooltip
            {...TOOLTIP_PROPS}
            cursor={{ strokeDasharray: "3 3", stroke: "rgba(56,189,248,0.4)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as { x: number; y: number; id: string };
              return (
                <div
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs shadow-xl"
                  style={{ background: "#0c0d12", color: "#e4e4e7" }}
                >
                  <p className="font-mono text-[10px] text-zinc-500">{p.id}</p>
                  <p className="mt-1 text-zinc-300">
                    {xLabel}: <span className="text-white">{p.x}</span>
                  </p>
                  <p className="text-zinc-300">
                    {yLabel}: <span className="text-white">{p.y}</span>
                  </p>
                </div>
              );
            }}
          />
          <Scatter name="assessments" data={data} fill={color} fillOpacity={0.55} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

function Skeleton() {
  return <div className="h-72 animate-pulse rounded-xl bg-white/[0.05]" />;
}

function Empty() {
  return <p className="py-12 text-center text-sm text-zinc-500">No data for current filters.</p>;
}
