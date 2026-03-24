"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { getCorrelations } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { analyticsFilteredQuery } from "@/lib/analytics-query";

export default function CorrelationsPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["correlations", filtersKey],
    queryFn: ({ signal }) => getCorrelations(filters, signal),
    ...analyticsFilteredQuery,
  });

  const data = q.data;
  const matrix = data?.matrix ?? [];
  const names = [...new Set(matrix.map((c) => c.row))].sort((a, b) => a.localeCompare(b));

  return (
    <PageShell
      title="Correlation engine"
      eyebrow="Anemia × BMI & outcome drivers"
      subtitle="Pearson r on assessment-level series within the current filter window. Interpret as exploratory — not causal."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : data ? (
        <div className="space-y-10">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Preconception — anemia vs BMI bands
              </p>
              <p className="mt-3 font-mono text-2xl text-cyan-400">
                r = {data.anemia_vs_bmi.preconception.r?.toFixed(4) ?? "n/a"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                n = {data.anemia_vs_bmi.preconception.series.length} assessments
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
                n = {data.anemia_vs_bmi.pregnancy.series.length} assessments
              </p>
            </div>
          </div>

          {names.length > 0 ? (
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
                        const cell = matrix.find((c) => c.row === row && c.col === col);
                        const r = cell?.r;
                        const heat =
                          r === null || r === undefined
                            ? "bg-transparent"
                            : r > 0.5
                              ? "bg-emerald-500/30"
                              : r > 0.2
                                ? "bg-emerald-500/15"
                                : r < -0.5
                                  ? "bg-rose-500/30"
                                  : r < -0.2
                                    ? "bg-rose-500/15"
                                    : "bg-white/5";
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
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
