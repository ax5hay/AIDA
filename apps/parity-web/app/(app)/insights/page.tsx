"use client";

import type { ParityAnalyticsBundle } from "@aida/parity-core";
import { PageShell, Section } from "@aida/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useMemo, useState } from "react";
import {
  fetchAnalytics,
  fetchBlocks,
  fetchDistricts,
  fetchFacilities,
  fetchFacilityTypes,
  fetchRegions,
} from "@/lib/api";
import { ParityIndicatorTimeChart } from "@/components/parity-indicator-time-chart";
import { formatParityAnalyticsPeriodKey, formatPeriodKey, formatSubmissionPeriod } from "@/lib/parity-months";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function num(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function pct(p: number) {
  return `${(p * 100).toFixed(1)}%`;
}

/** Table header with a second-line denominator note (client-facing). */
function ThDenom({
  align = "right",
  children,
  denom,
}: {
  align?: "left" | "right";
  children: ReactNode;
  denom: string;
}) {
  return (
    <th className={`p-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{children}</div>
      <div
        className={`mt-1 text-[10px] font-normal normal-case tracking-normal leading-snug text-zinc-600 ${align === "right" ? "text-right" : "text-left"}`}
      >
        {denom}
      </div>
    </th>
  );
}

function iqrPlain(fence: string) {
  if (fence === "low") return "Below the usual range for this selection";
  if (fence === "high") return "Above the usual range for this selection";
  return fence;
}

function comparedToBlock(z: number) {
  const a = Math.abs(z).toFixed(1);
  if (z > 0) return `Roughly ${a}× the typical spread above the block’s average`;
  return `Roughly ${a}× the typical spread below the block’s average`;
}

function comparedToType(z: number) {
  const a = Math.abs(z).toFixed(1);
  if (z > 0) return `Roughly ${a}× the typical spread above the average for this facility type`;
  return `Roughly ${a}× the typical spread below the average for this facility type`;
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-[#0a0b10] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-zinc-200">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-zinc-400">
          {(p.name || p.dataKey) ?? "Value"}: <span className="tabular-nums text-zinc-100">{num(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
}: {
  title: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{hint}</p>
    </div>
  );
}

/** Bordered panel for anomaly / quality rows (matches KPI / table chrome). */
function InsightPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 ${className ?? ""}`}>{children}</div>
  );
}

function InsightsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const patchDateQuery = (patch: { from?: string; to?: string }) => {
    const p = new URLSearchParams(searchParams.toString());
    if (patch.from !== undefined) {
      if (patch.from) p.set("from", patch.from);
      else p.delete("from");
    }
    if (patch.to !== undefined) {
      if (patch.to) p.set("to", patch.to);
      else p.delete("to");
    }
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const [districtId, setDistrictId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [facilityTypeId, setFacilityTypeId] = useState("");

  const districtsQ = useQuery({ queryKey: ["parity-districts"], queryFn: fetchDistricts });
  const blocksQ = useQuery({
    queryKey: ["parity-blocks", districtId],
    queryFn: () => fetchBlocks(districtId || undefined),
    enabled: !!districtId,
  });
  const regionsQ = useQuery({
    queryKey: ["parity-regions", blockId],
    queryFn: () => fetchRegions(blockId || undefined),
    enabled: !!blockId,
  });
  const facilitiesQ = useQuery({
    queryKey: ["parity-facilities", regionId],
    queryFn: () => fetchFacilities(regionId || undefined),
    enabled: !!regionId,
  });
  const ftQ = useQuery({ queryKey: ["parity-ft"], queryFn: fetchFacilityTypes });

  const ftById = useMemo(() => {
    const m = new Map<string, { code: string; label: string }>();
    for (const f of ftQ.data ?? []) m.set(f.id, { code: f.code, label: f.label });
    return m;
  }, [ftQ.data]);

  const analyticsQ = useQuery({
    queryKey: ["parity-analytics", districtId, blockId, regionId, facilityId, facilityTypeId, dateFrom, dateTo],
    queryFn: () =>
      fetchAnalytics({
        districtId: districtId || undefined,
        blockId: blockId || undefined,
        regionId: regionId || undefined,
        facilityId: facilityId || undefined,
        facilityTypeId: facilityTypeId || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }),
    enabled: !invalidDateRange,
  });

  const a = analyticsQ.data as ParityAnalyticsBundle | undefined;

  const timeSeriesChart = useMemo(() => {
    if (!a) return [];
    return a.timeSeries.map((t) => ({ ...t, monthLabel: formatPeriodKey(t.period) }));
  }, [a]);

  return (
    <PageShell
      title="Data analytics"
      eyebrow="Parity"
      subtitle="Portfolio overview for your current filters — place, optional reporting date range, facility type — plus trends and quality cards."
      explainer={{
        what: "A single dashboard for the slice of ANC data you care about right now (place, calendar window, and facility type).",
        does: "Use From / To to limit analytics to returns whose reporting day or month overlaps that window (same idea as AIDA’s date filters). Every rate states its denominator so you can line numbers up with programme logic.",
      }}
    >
      <div className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-300">What this is:</span> the scope control for everything below — your
          “selected programme slice”.{" "}
          <span className="font-medium text-zinc-300">What it does:</span> narrows roll-ups by place, optional{" "}
          <span className="text-zinc-400">From / To</span> reporting window (daily rows by calendar day; whole-month rows
          if that month overlaps the range), and facility type. Blank dates mean no calendar limit. The URL keeps{" "}
          <span className="font-mono text-zinc-400">from</span> / <span className="font-mono text-zinc-400">to</span> so
          you can share the same window.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            District
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200"
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setBlockId("");
                setRegionId("");
                setFacilityId("");
              }}
            >
              <option value="">All districts</option>
              {(districtsQ.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Block
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200 disabled:opacity-40"
              disabled={!districtId}
              value={blockId}
              onChange={(e) => {
                setBlockId(e.target.value);
                setRegionId("");
                setFacilityId("");
              }}
            >
              <option value="">All blocks</option>
              {(blocksQ.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Region
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200 disabled:opacity-40"
              disabled={!blockId}
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setFacilityId("");
              }}
            >
              <option value="">All regions</option>
              {(regionsQ.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Facility
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200 disabled:opacity-40"
              disabled={!regionId}
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              <option value="">All facilities</option>
              {(facilitiesQ.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.facilityType.code} — {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Facility type
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200"
              value={facilityTypeId}
              onChange={(e) => setFacilityTypeId(e.target.value)}
            >
              <option value="">All types</option>
              {(ftQ.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} — {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            From (reporting date)
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                const v = e.target.value;
                if (v && dateTo && v > dateTo) {
                  patchDateQuery({ from: v, to: "" });
                  return;
                }
                patchDateQuery({ from: v || "" });
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            To (reporting date)
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-normal normal-case text-zinc-200"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                const v = e.target.value;
                if (v && dateFrom && v < dateFrom) {
                  patchDateQuery({ from: "", to: v });
                  return;
                }
                patchDateQuery({ to: v || "" });
              }}
            />
          </label>
        </div>
        {invalidDateRange ? (
          <p className="mt-3 text-sm text-rose-400">“From” must be on or before “To”. Adjust the dates to load analytics.</p>
        ) : null}
      </div>

      {analyticsQ.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : analyticsQ.error ? (
        <p className="text-sm text-rose-400">{(analyticsQ.error as Error).message}</p>
      ) : a ? (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            <Kpi
              title="Return rows"
              value={num(a.summary.submissionCount)}
              hint="Saved rows in this selection — whole-month or single-day returns (see daily banner below when mixed)."
            />
            <Kpi
              title="Facilities represented"
              value={num(a.summary.distinctFacilities)}
              hint="Different sites that filed at least one return in this selection."
            />
            <Kpi
              title="Regions represented"
              value={num(a.summary.distinctRegions)}
              hint="Lowest geography level under block (village area / sector)."
            />
            <Kpi
              title="Total ANC attendance (sum)"
              value={num(a.summary.sumTotalWomenAttendedAnc)}
              hint={`Sum of “total ANC” across the ${num(a.summary.submissionCount)} returns; blanks are treated as zero in roll-ups, so this equals summing only the ${num(a.summary.returnsWithNonNullTotalAnc)} filled values.`}
            />
            <Kpi
              title="Typical month (median ANC total)"
              value={num(a.summary.medianTotalWomenAttendedAnc)}
              hint={
                a.summary.returnsWithNonNullTotalAnc > 0
                  ? `Among ${num(a.summary.returnsWithNonNullTotalAnc)} returns with “total ANC” filled (excludes ${num(a.summary.returnsMissingTotalAnc)} returns where that cell is blank).`
                  : "No returns with ANC total filled in this selection."
              }
            />
            <Kpi
              title="Average ANC total per return"
              value={num(a.summary.avgTotalWomenAttendedAnc)}
              hint={
                a.summary.returnsWithNonNullTotalAnc > 0
                  ? `Total ANC summed ÷ ${num(a.summary.returnsWithNonNullTotalAnc)} returns with ANC filled (same denominator as median / 90th percentile).`
                  : "—"
              }
            />
            <Kpi
              title="90th percentile (ANC total)"
              value={num(a.summary.p90TotalWomenAttendedAnc)}
              hint={
                a.summary.returnsWithNonNullTotalAnc > 0
                  ? `Ranked among ${num(a.summary.returnsWithNonNullTotalAnc)} returns with ANC filled — about 90% of those values are at or below this level.`
                  : "—"
              }
            />
            <Kpi
              title="Blank indicator cells"
              value={pct(a.summary.nullFieldRate)}
              hint={`${num(a.summary.nullIndicatorCells)} blank of ${num(a.summary.totalIndicatorCells)} cells (${num(a.summary.submissionCount)} returns × ${num(a.summary.indicatorsPerMonthlyReturn)} programme indicators each).`}
            />
          </section>

          <InsightPanel>
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Overview of this selection</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The numbers above and the sections below all describe the same filtered set:{" "}
              <span className="text-zinc-200">{num(a.summary.submissionCount)}</span> saved return rows from{" "}
              <span className="text-zinc-200">{num(a.summary.distinctFacilities)}</span> facilities, spanning{" "}
              {a.summary.periodMin && a.summary.periodMax ? (
                <>
                  <span className="text-zinc-200">
                    {formatParityAnalyticsPeriodKey(a.summary.periodMin)} –{" "}
                    {formatParityAnalyticsPeriodKey(a.summary.periodMax)}
                  </span>{" "}
                  (earliest and latest reporting period in the data).
                </>
              ) : (
                "the available reporting months."
              )}
            </p>
            <div className="mt-4 border-t border-white/10 pt-4">
              {a.summary.hasDailyReturns ? (
                <p className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
                  This selection includes <span className="font-medium">daily</span> returns (calendar-day rows) as well
                  as any whole-month rows. Charts that say “by day” only use daily rows; month roll-ups include both.
                </p>
              ) : null}
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-cyan-400/85">Denominators (this filter)</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Monthly returns</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.submissionCount)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">Row count: one per facility per reporting month in the slice.</dd>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Indicator cells (all returns)</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.totalIndicatorCells)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">
                    {num(a.summary.submissionCount)} × {num(a.summary.indicatorsPerMonthlyReturn)} programme indicators;
                    blank-rate uses this as denominator.
                  </dd>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Returns with ANC total filled</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.returnsWithNonNullTotalAnc)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">
                    Averages, median, percentiles, IQR, and MAD use this count.
                    {a.summary.returnsMissingTotalAnc > 0
                      ? ` ${num(a.summary.returnsMissingTotalAnc)} return(s) omit ANC total and are left out of those stats.`
                      : null}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Distinct facilities</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.distinctFacilities)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">Sites that appear at least once in the filtered returns.</dd>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Distinct regions</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.distinctRegions)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">Lowest geography level in the hierarchy for this slice.</dd>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <dt className="text-[11px] text-zinc-500">Total ANC (numerator)</dt>
                  <dd className="mt-1 tabular-nums text-zinc-100">{num(a.summary.sumTotalWomenAttendedAnc)}</dd>
                  <dd className="mt-1 text-xs text-zinc-600">
                    Σ ANC across all returns in the filter (missing ANC counts as 0 in sums — same number as summing the{" "}
                    {num(a.summary.returnsWithNonNullTotalAnc)} non-blank values).
                  </dd>
                </div>
              </dl>
            </div>
          </InsightPanel>

          <Section
            title="ANC attendance by district"
            hint="Chart + table"
          >
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> how many women are counted under ANC in
              each district for the months you filtered. <span className="font-medium text-zinc-300">Use it to:</span>{" "}
              compare programme scale and spot districts that contribute most volume.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> bar height is the summed ANC total; return
              rows per district are in the table (averages divide by that return count).
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
              <div className="h-64 rounded-xl border border-white/10 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={a.byDistrict}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar
                      dataKey="sumTotalWomenAttendedAnc"
                      fill="rgba(34,211,238,0.55)"
                      name="Women who attended ANC (summed)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                  Y-axis: sum of “total ANC” in district. Table denominator for averages: return rows in that district.
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">District</th>
                      <ThDenom denom="Saved return rows in district">Returns</ThDenom>
                      <ThDenom denom="Σ ANC (filled cells)">Total ANC</ThDenom>
                      <ThDenom denom="Total ANC ÷ returns">Avg / return</ThDenom>
                    </tr>
                  </thead>
                  <tbody>
                    {a.byDistrict.map((d) => (
                      <tr key={d.districtId} className="border-b border-white/5">
                        <td className="p-3 text-zinc-300">{d.name}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{d.submissions}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-200">{num(d.sumTotalWomenAttendedAnc)}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{num(d.avgTotalWomenAttendedAnc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section title="ANC attendance over time" hint="By reporting month">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> how total attendance moves month to
              month. <span className="font-medium text-zinc-300">Use it to:</span> see seasonality, campaign effects, or
              sudden drops that need follow-up.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> each point sums ANC across the returns
              filed for that calendar month; the line does not divide by number of facilities unless you use the average
              column.
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
              <div className="h-64 rounded-xl border border-white/10 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: "#a1a1aa", fontSize: 9 }}
                      angle={timeSeriesChart.length > 10 ? -42 : -28}
                      textAnchor="end"
                      height={timeSeriesChart.length > 10 ? 76 : 56}
                      interval={timeSeriesChart.length > 18 ? "preserveStartEnd" : 0}
                      minTickGap={timeSeriesChart.length > 18 ? 8 : undefined}
                    />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <Tooltip content={<ChartTip />} />
                    <Line
                      type="monotone"
                      dataKey="sumTotalWomenAttendedAnc"
                      stroke="rgba(34,211,238,0.85)"
                      name="Women who attended ANC (summed)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                  Point = Σ ANC for that month. Avg column = Σ ANC ÷ returns filed in that month.
                </p>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[#07080c]">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Reporting month</th>
                      <ThDenom denom="Returns filed this month">Returns</ThDenom>
                      <ThDenom denom="Σ ANC this month">Total ANC</ThDenom>
                      <ThDenom denom="Σ ANC ÷ returns this month">Avg / return</ThDenom>
                    </tr>
                  </thead>
                  <tbody>
                    {a.timeSeries.map((t) => (
                      <tr key={t.period} className="border-b border-white/5">
                        <td className="p-3 text-zinc-200">{formatPeriodKey(t.period)}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{t.submissions}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-200">
                          {num(t.sumTotalWomenAttendedAnc)}
                        </td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">
                          {num(t.avgTotalWomenAttendedAnc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-600">
              Inline denominator: <span className="tabular-nums text-zinc-400">{num(a.summary.submissionCount)}</span>{" "}
              return rows in this filter feed the month buckets above (each whole-month or daily row counts once).
            </p>
          </Section>

          <Section title="Programme indicators over time" hint="AIDA-style multi-series">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> the same idea as AIDA’s section time
              series — several programme indicators together on a timeline.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> tooltips show how many saved returns were
              summed in each bucket; line height is the summed counts (blanks inside a return count as zero in the sum).{" "}
              <span className="font-medium text-zinc-300">IFA tablet totals</span> are omitted here (they dwarf
              head-count indicators); see each return under Observation centre for IFA fields, or the supplements section
              in completeness below.
            </p>
            <div className="space-y-8">
              <ParityIndicatorTimeChart
                title="By calendar month (all returns rolled up)"
                subtitle={`${num(a.summary.submissionCount)} returns in this filter. Each month sums every row whose calendar month matches (monthly rows and daily rows).`}
                series={a.indicatorTimeSeriesMonthly}
                tickFormatter={(v) => formatPeriodKey(v)}
              />
              {a.summary.hasDailyReturns ? (
                <ParityIndicatorTimeChart
                  title="By calendar day (daily returns only)"
                  subtitle="Only rows filed as a single calendar day. Whole-month returns are excluded so daily numerators are not mixed with a monthly aggregate."
                  series={a.indicatorTimeSeriesDaily}
                  tickFormatter={(v) => formatParityAnalyticsPeriodKey(v)}
                />
              ) : (
                <InsightPanel className="border-dashed border-white/15">
                  <p className="text-sm text-zinc-500">
                    No daily returns in this selection. Use ANC capture with “Single calendar day” to add day-level rows,
                    then filter here to see day-based trends.
                  </p>
                </InsightPanel>
              )}
            </div>
          </Section>

          <Section title="Form completeness by section" hint="Blank cells">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> for each themed section of the ANC
              form, what share of data cells were left empty.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> for each section,{" "}
              {num(a.summary.submissionCount)} returns × indicators in that section (see counts per row).{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> prioritise training or supervision where
              whole sections are often missing.
            </p>
            <InsightPanel>
              <ul className="space-y-4">
                {a.completenessBySection.map((c) => (
                  <li key={c.label} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-zinc-500">
                      <span className="text-zinc-300">{c.label}</span>
                      <span className="text-right">
                        <span className="tabular-nums text-zinc-200">{pct(c.nullRate)}</span> blank
                        <span className="mt-0.5 block text-[11px] text-zinc-600">
                          {num(c.blankCells)} of {num(c.totalCells)} cells ({num(a.summary.submissionCount)} returns ×{" "}
                          {c.fields} indicators)
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-amber-500/50"
                        style={{ width: `${Math.min(100, c.nullRate * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </InsightPanel>
          </Section>

          <Section title="Block and region breakdown" hint="Full grid">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> every block–region pair that filed
              returns, with counts and summed ANC attendance.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> averages divide by returns in that block–region pair.{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> compare neighbouring areas without guessing
              from a chart alone.
            </p>
            <div className="max-h-96 overflow-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[#07080c]">
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Block</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Region</th>
                    <ThDenom denom="Returns in pair">Returns</ThDenom>
                    <ThDenom denom="Σ ANC in pair">Total ANC</ThDenom>
                    <ThDenom denom="Σ ANC ÷ returns">Avg / return</ThDenom>
                  </tr>
                </thead>
                <tbody>
                  {a.byBlockRegion.map((r) => (
                    <tr key={`${r.blockId}-${r.regionId}`} className="border-b border-white/5">
                      <td className="p-3 text-zinc-300">{r.blockName}</td>
                      <td className="p-3 text-zinc-400">{r.regionName}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-400">{r.submissions}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-200">{num(r.sumTotalWomenAttendedAnc)}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-400">{num(r.avgTotalWomenAttendedAnc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="By block" hint="Table">
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                Totals rolled up to the block (admin unit under district).
              </p>
              <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[#07080c]">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Block</th>
                      <ThDenom denom="Returns in block">Returns</ThDenom>
                      <ThDenom denom="Σ ANC in block">Total ANC</ThDenom>
                      <ThDenom denom="Σ ANC ÷ returns">Avg / return</ThDenom>
                    </tr>
                  </thead>
                  <tbody>
                    {a.byBlock.map((b) => (
                      <tr key={b.blockId} className="border-b border-white/5">
                        <td className="p-3 text-zinc-300">{b.name}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{b.submissions}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-200">{num(b.sumTotalWomenAttendedAnc)}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{num(b.avgTotalWomenAttendedAnc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
            <Section title="By region" hint="Table">
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                Each row is one region. <span className="font-medium text-zinc-400">Sites</span> = distinct facilities
                with ≥1 return (denominator for “how many facilities” in the region). Averages use return rows in the
                region.
              </p>
              <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[#07080c]">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Region</th>
                      <ThDenom denom="Distinct facilities">Sites</ThDenom>
                      <ThDenom denom="Returns in region">Returns</ThDenom>
                      <ThDenom denom="Σ ANC in region">Total ANC</ThDenom>
                      <ThDenom denom="Σ ANC ÷ returns">Avg / return</ThDenom>
                    </tr>
                  </thead>
                  <tbody>
                    {a.byRegion.map((r) => (
                      <tr key={r.regionId} className="border-b border-white/5">
                        <td className="p-3 text-zinc-300">
                          {r.name} <span className="text-zinc-600">({r.blockName})</span>
                        </td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{r.facilityCount}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{r.submissions}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-200">{num(r.sumTotalWomenAttendedAnc)}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{num(r.avgTotalWomenAttendedAnc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          <Section title="By facility type" hint="CH, CHC, PHC, …">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              Compare workload across categories of facility (each type is labelled when you set up the programme).
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Type</th>
                    <ThDenom denom="Returns of this type">Returns</ThDenom>
                    <ThDenom denom="Σ ANC for type">Total ANC</ThDenom>
                    <ThDenom denom="Σ ANC ÷ returns">Avg / return</ThDenom>
                  </tr>
                </thead>
                <tbody>
                  {a.byFacilityType.map((f) => {
                    const meta = ftById.get(f.facilityTypeId);
                    return (
                      <tr key={f.facilityTypeId} className="border-b border-white/5">
                        <td className="p-3 text-zinc-300">
                          <span className="font-mono text-cyan-200/80">{f.code}</span>
                          {meta ? ` — ${meta.label}` : null}
                        </td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{f.submissions}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-200">{num(f.sumTotalWomenAttendedAnc)}</td>
                        <td className="p-3 text-right tabular-nums text-zinc-400">{num(f.avgTotalWomenAttendedAnc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Sites with the highest total ANC (in this filter)" hint="Top 20">
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Ranked by summed “total women who attended ANC” across all months in your current selection.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> per-facility averages divide by that
              facility’s return count in the filter.
            </p>
            <div className="max-h-96 overflow-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[#07080c]">
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Facility</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wide text-zinc-500">Region</th>
                    <ThDenom denom="Returns from this site">Returns</ThDenom>
                    <ThDenom denom="Σ ANC (site)">Total ANC</ThDenom>
                    <ThDenom denom="Σ ANC ÷ returns">Avg / return</ThDenom>
                  </tr>
                </thead>
                <tbody>
                  {a.byFacility.slice(0, 20).map((f) => (
                    <tr key={f.facilityId} className="border-b border-white/5">
                      <td className="p-3 text-zinc-200">
                        <span className="font-mono text-xs text-cyan-200/80">{f.facilityTypeCode}</span> {f.name}
                      </td>
                      <td className="p-3 text-zinc-500">{f.regionName}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-400">{f.submissions}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-200">{num(f.sumTotalWomenAttendedAnc)}</td>
                      <td className="p-3 text-right tabular-nums text-zinc-400">{num(f.avgTotalWomenAttendedAnc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Months outside the usual range (total ANC)"
            hint="Compared with the whole filtered set"
          >
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> facilities whose ANC total on one return is much
              lower or much higher than the spread seen across all returns you are looking at right now — a simple
              “thick pencil” check before deeper review.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> the “usual range” is calculated from{" "}
              <span className="tabular-nums text-zinc-300">{num(a.summary.returnsWithNonNullTotalAnc)}</span> returns
              with ANC total filled in this filter
              {a.summary.returnsWithNonNullTotalAnc >= 4 ? "" : " (need at least 4 filled returns to draw a range — none shown if below that)"}.{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> short-list months to open and confirm.
            </p>
            {a.outliersIqr.length === 0 ? (
              <InsightPanel className="border-dashed border-white/15">
                <p className="text-sm text-zinc-500">
                  No returns sit outside the usual range for this selection.
                </p>
              </InsightPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {a.outliersIqr.map((r) => (
                  <InsightPanel key={r.submissionId}>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Facility & month</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{r.facilityLabel}</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2 border-t border-white/5 pt-2">
                        <dt className="text-zinc-500">Total ANC (this month)</dt>
                        <dd className="tabular-nums text-zinc-100">{num(r.totalWomenAttendedAnc)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Versus this selection</dt>
                        <dd className="text-right text-zinc-300">{iqrPlain(r.fence)}</dd>
                      </div>
                      <div className="text-[11px] leading-snug text-zinc-600">
                        Compared among {num(a.summary.returnsWithNonNullTotalAnc)} returns with ANC filled (this filter).
                      </div>
                    </dl>
                    <Link
                      href={`/observe/${r.submissionId}`}
                      className="mt-4 inline-flex text-xs font-medium text-cyan-400/90 hover:underline"
                    >
                      Open full return →
                    </Link>
                  </InsightPanel>
                ))}
              </div>
            )}
          </Section>

          <Section title="Rare extremes (automated check)" hint="Verify before acting">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> a stricter check that catches only the
              most extreme highs and lows, even when the dataset is noisy. Treat these as “verify first” — they are not
              proof of an error.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> same ANC-filled population as the headline
              stats — <span className="tabular-nums text-zinc-300">{num(a.summary.returnsWithNonNullTotalAnc)}</span>{" "}
              returns (needs at least three non-null values for this test).{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> prioritise data quality calls.
            </p>
            {a.anomaliesMad.length === 0 ? (
              <InsightPanel className="border-dashed border-white/15">
                <p className="text-sm text-zinc-500">No extreme values flagged in this selection.</p>
              </InsightPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {a.anomaliesMad.map((r) => (
                  <InsightPanel key={r.submissionId} className="border-violet-500/15">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-violet-300/80">Rare extreme</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{r.facilityLabel}</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      ANC total:{" "}
                      <span className="tabular-nums text-violet-100/95">{num(r.totalWomenAttendedAnc)}</span>
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      Baseline: {num(a.summary.returnsWithNonNullTotalAnc)} returns with ANC filled in this filter.
                    </p>
                    <Link
                      href={`/observe/${r.submissionId}`}
                      className="mt-4 inline-flex text-xs font-medium text-cyan-400/90 hover:underline"
                    >
                      Open full return →
                    </Link>
                  </InsightPanel>
                ))}
              </div>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Unusual compared with the same block" hint="Peer comparison">
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                Highlights months where the facility’s total ANC is far from the average of other facilities in its
                block. <span className="font-medium text-zinc-300">Denominator:</span> each card shows how many returns
                in that block had ANC filled — the average and spread are computed from that peer pool only.
              </p>
              {a.anomaliesByBlock.length === 0 ? (
                <InsightPanel className="border-dashed border-white/15">
                  <p className="text-sm text-zinc-500">Nothing flagged for this selection.</p>
                </InsightPanel>
              ) : (
                <div className="grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-1">
                  {a.anomaliesByBlock.map((r) => (
                    <InsightPanel key={r.submissionId}>
                      <p className="text-sm font-medium text-zinc-100">{r.facilityLabel}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Block: <span className="text-zinc-400">{r.blockName}</span>
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        ANC total: <span className="tabular-nums text-zinc-100">{num(r.totalWomenAttendedAnc)}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        Peer pool: {num(r.peerReturnsWithAncInBlock)} returns with ANC filled in this block (same filter).
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{comparedToBlock(r.zScore)}</p>
                      <Link href={`/observe/${r.submissionId}`} className="mt-3 inline-flex text-xs font-medium text-cyan-400/90 hover:underline">
                        Open full return →
                      </Link>
                    </InsightPanel>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Unusual compared with the same facility type" hint="Peer comparison">
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                Same idea as the block view, but peers are every other site with the same facility category (for example
                all PHCs together). <span className="font-medium text-zinc-300">Denominator:</span> count of returns with
                ANC filled for that facility type in this filter (shown on each card).
              </p>
              {a.anomaliesByFacilityType.length === 0 ? (
                <InsightPanel className="border-dashed border-white/15">
                  <p className="text-sm text-zinc-500">Nothing flagged for this selection.</p>
                </InsightPanel>
              ) : (
                <div className="grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1">
                  {a.anomaliesByFacilityType.map((r) => (
                    <InsightPanel key={r.submissionId}>
                      <p className="text-sm font-medium text-zinc-100">{r.facilityLabel}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Facility type code:{" "}
                        <span className="font-mono text-cyan-200/80">{r.facilityTypeCode}</span>
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        ANC total: <span className="tabular-nums text-zinc-100">{num(r.totalWomenAttendedAnc)}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        Peer pool: {num(r.peerReturnsWithAncInFacilityType)} returns with ANC filled for this facility type
                        (same filter).
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{comparedToType(r.zScore)}</p>
                      <Link href={`/observe/${r.submissionId}`} className="mt-3 inline-flex text-xs font-medium text-cyan-400/90 hover:underline">
                        Open full return →
                      </Link>
                    </InsightPanel>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <Section title="Possible duplicate return for one facility" hint="Same site, same reporting period">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> more than one return saved for the same
              facility and reporting period (whole month or the same calendar day) — usually a data-entry mistake.{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> expect exactly{" "}
              <span className="text-zinc-300">one</span> row per facility per period bucket; counts above one flag a clash.{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> delete or merge the extra row after checking
              with the site.
            </p>
            {a.redundancies.length === 0 ? (
              <InsightPanel className="border-dashed border-white/15">
                <p className="text-sm text-zinc-500">No duplicate facility-and-period pairs detected.</p>
              </InsightPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {a.redundancies.map((r, i) => (
                  <InsightPanel key={i} className="border-amber-500/20">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-amber-200/80">Duplicate period</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{r.facilityName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Reporting period:{" "}
                      <span className="text-zinc-300">
                        {formatSubmissionPeriod(r.periodYear, r.periodMonth, r.periodDay)}
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-amber-200/90">
                      {r.submissionIds.length} saved rows for this facility and period
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.submissionIds.map((sid, j) => (
                        <Link
                          key={sid}
                          href={`/observe/${sid}`}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-100/90 hover:bg-cyan-500/20"
                        >
                          Open copy {j + 1}
                        </Link>
                      ))}
                    </div>
                  </InsightPanel>
                ))}
              </div>
            )}
          </Section>

          <Section title="Internal consistency checks" hint="Cross-field rules">
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">What this shows:</span> simple logic checks inside one saved
              return (for example, counts that contradict each other).{" "}
              <span className="font-medium text-zinc-300">Denominator:</span> each rule compares two indicators on the{" "}
              <span className="text-zinc-300">same</span> return — not against peers.{" "}
              <span className="font-medium text-zinc-300">Use it to:</span> fix obvious entry errors before reporting.
            </p>
            {a.qualityFlags.length === 0 ? (
              <InsightPanel className="border-dashed border-white/15">
                <p className="text-sm text-zinc-500">No consistency issues in this selection.</p>
              </InsightPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {a.qualityFlags.map((r, i) => (
                  <InsightPanel
                    key={i}
                    className={r.severity === "error" ? "border-rose-500/25" : "border-white/10"}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Consistency</p>
                    <p className={`mt-1 text-sm font-medium ${r.severity === "error" ? "text-rose-200" : "text-zinc-200"}`}>
                      {r.facilityLabel}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Reporting period:{" "}
                      <span className="text-zinc-300">{formatParityAnalyticsPeriodKey(r.period)}</span>
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{r.message}</p>
                    <Link
                      href={`/observe/${r.submissionId}`}
                      className="mt-4 inline-flex text-xs font-medium text-cyan-400/90 hover:underline"
                    >
                      Open full return →
                    </Link>
                  </InsightPanel>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : null}
    </PageShell>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-zinc-500">Loading analytics…</div>}>
      <InsightsContent />
    </Suspense>
  );
}
