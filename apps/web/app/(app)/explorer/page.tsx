"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { getExplorer } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";
import { analyticsFilteredQuery } from "@/lib/analytics-query";

export default function ExplorerPage() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["explorer", filtersKey],
    queryFn: ({ signal }) => getExplorer(filters, signal),
    ...analyticsFilteredQuery,
  });

  return (
    <PageShell
      title="Data explorer"
      eyebrow="Assessments"
      subtitle="Filter by period, district, and facility — query params stay in the URL for shareable views."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : q.data ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Showing <span className="font-mono text-white">{q.data.meta.totalCount}</span> assessments
            {JSON.stringify(q.data.meta.filters) !== "{}" ? (
              <span className="text-zinc-500"> · filters {JSON.stringify(q.data.meta.filters)}</span>
            ) : null}
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="p-3">Period start</th>
                  <th className="p-3">Period end</th>
                  <th className="p-3">Facility</th>
                  <th className="p-3">District</th>
                  <th className="p-3 text-right">ANC reg.</th>
                  <th className="p-3 text-right">Live births</th>
                  <th className="p-3 text-right">Mat. deaths</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Docs</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.008, 0.25) }}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="p-3 font-mono text-xs text-zinc-300">
                      {row.periodStart.slice(0, 10)}
                    </td>
                    <td className="p-3 font-mono text-xs text-zinc-400">
                      {row.periodEnd.slice(0, 10)}
                    </td>
                    <td className="p-3 text-zinc-200">{row.facility.name}</td>
                    <td className="p-3 text-zinc-500">{row.facility.district}</td>
                    <td className="p-3 text-right font-mono text-xs text-zinc-300">
                      {row.preview.total_anc_registered ?? "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-zinc-300">
                      {row.preview.live_births ?? "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-zinc-300">
                      {row.preview.maternal_deaths ?? "—"}
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      {row.remarks.hasObservational || row.remarks.hasRespondent
                        ? `obs ${row.remarks.observationalLength} / resp ${row.remarks.respondentLength} chars`
                        : "none"}
                    </td>
                    <td className="p-3 font-mono text-xs text-zinc-400">{row.documents.filledSlots}/6</td>
                    <td className="p-3">
                      <Link
                        href={withQueryString(`/explorer/${row.id}`, qs)}
                        className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                      >
                        Open
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
