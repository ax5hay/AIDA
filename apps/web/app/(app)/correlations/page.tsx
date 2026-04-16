"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { getCorrelations } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { correlationMatrixCellHeatClass } from "@/lib/correlation-heatmap";

function rLabel(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  return v.toFixed(3);
}

export default function CorrelationsPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["correlations", filtersKey],
    queryFn: ({ signal }) => getCorrelations(filters, signal),
    ...analyticsFilteredQuery,
  });

  const data = q.data;
  const matrix = data?.matrix ?? [];
  const names = [...new Set(matrix.flatMap((c) => [c.row, c.col]))].sort((a, b) =>
    a.localeCompare(b),
  );
  const matrixLookup = new Map(matrix.map((cell) => [`${cell.row}::${cell.col}`, cell.r]));

  const iv = data?.interventionComparison;

  return (
    <PageShell
      title="Correlation engine"
      eyebrow="Drivers · programme timing · outcomes"
      subtitle="Pearson r on assessment-level engineered series (same definitions as the analytics engine). Before/after uses a median reporting-date split when timestamps vary; if every row shares the same period, the API falls back to splitting by row order."
      explainer={{
        what: "Statistical relationships between anemia proxies, BMI bands, and live births in your filter.",
        does: "Shows full-matrix correlations plus an automatic first-half vs second-half comparison by reporting period to frame programme success narratives.",
      }}
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : data ? (
        <div className="space-y-10">
          {iv ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-5 sm:p-6">
              <h2 className="text-sm font-medium text-emerald-200/90">Before & after (time-aware split)</h2>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">
                Method: <span className="text-zinc-400">{iv.method}</span>
              </p>
              <p className="mt-2 text-sm text-zinc-400">{iv.note}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Cutoff period (last month of &quot;before&quot; window):{" "}
                <span className="font-mono text-zinc-300">{iv.cutoffPeriodStart ?? "n/a"}</span>
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] font-medium uppercase text-zinc-500">Earlier period</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    n = <span className="font-mono">{iv.before.n}</span> assessments · Σ live births{" "}
                    <span className="font-mono">{iv.before.live_sum}</span>
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                    <li>
                      Preconception anemia × BMI bands: <span className="font-mono text-cyan-400/90">r = {rLabel(iv.before.pre_r)}</span>
                    </li>
                    <li>
                      Pregnancy anemia × BMI bands: <span className="font-mono text-cyan-400/90">r = {rLabel(iv.before.preg_r)}</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] font-medium uppercase text-zinc-500">Later period</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    n = <span className="font-mono">{iv.after.n}</span> assessments · Σ live births{" "}
                    <span className="font-mono">{iv.after.live_sum}</span>
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                    <li>
                      Preconception anemia × BMI bands: <span className="font-mono text-cyan-400/90">r = {rLabel(iv.after.pre_r)}</span>
                    </li>
                    <li>
                      Pregnancy anemia × BMI bands: <span className="font-mono text-cyan-400/90">r = {rLabel(iv.after.preg_r)}</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-400">
                <p className="font-medium text-zinc-200">How to brief stakeholders</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                  <li>
                    If screening or referral programmes started mid-window, you expect different correlation structure
                    before vs after — pair this view with district rollups and ANC coverage on the Analytics page.
                  </li>
                  <li>
                    Σ live births moving between halves reflects workload and reporting volume, not intervention effect by
                    itself.
                  </li>
                  <li>Use Explorer to open outlier assessments when r shifts sharply.</li>
                </ul>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Preconception — anemia vs BMI bands
              </p>
              <p className="mt-3 font-mono text-2xl text-cyan-400">
                r = {data.anemia_vs_bmi.preconception.r?.toFixed(4) ?? "n/a"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                n = {data.anemia_vs_bmi.preconception.series.length} assessments (full window)
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Pregnancy — anemia vs BMI bands
              </p>
              <p className="mt-3 font-mono text-2xl text-cyan-400">
                r = {data.anemia_vs_bmi.pregnancy.r?.toFixed(4) ?? "n/a"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                n = {data.anemia_vs_bmi.pregnancy.series.length} assessments (full window)
              </p>
            </div>
          </div>

          {names.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-medium text-white">Full correlation matrix</h2>
              <p className="mb-3 text-xs text-zinc-500">
                Each cell is Pearson r between two series across assessments. Diagonal is 1.0; compare strength and sign
                for programme drivers.
              </p>
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
                          const heat = correlationMatrixCellHeatClass(r);
                          return (
                            <td key={col} className={`p-2 font-mono tabular-nums ${heat}`}>
                              {r !== null && r !== undefined ? r.toFixed(2) : "n/a"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
