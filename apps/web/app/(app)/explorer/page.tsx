"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { getExplorer } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { TABLE_PAGE_SIZE_OPTIONS, parseTablePageSize, type TablePageSize } from "@/lib/table-pagination";

export default function ExplorerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = parseTablePageSize(searchParams.get("pageSize"), 10);
  const qs = searchParams.toString();
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["explorer", filtersKey, page, pageSize],
    queryFn: ({ signal }) => getExplorer(filters, { page, pageSize, signal }),
    ...analyticsFilteredQuery,
  });

  const setPage = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(nextPage));
    p.set("pageSize", String(pageSize));
    router.replace(`${pathname}?${p.toString()}`);
  };

  const setPageSize = (next: TablePageSize) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("pageSize", String(next));
    p.set("page", "1");
    router.replace(`${pathname}?${p.toString()}`);
  };

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
            Showing page <span className="font-mono text-white">{q.data.meta.page}</span> of{" "}
            <span className="font-mono text-white">{q.data.meta.totalPages}</span> · total{" "}
            <span className="font-mono text-white">{q.data.meta.totalCount}</span> assessments
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="shrink-0">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as TablePageSize)}
                className="min-h-[40px] rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-zinc-200 sm:min-h-0 sm:text-xs"
              >
                {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, q.data.meta.page - 1))}
              disabled={q.data.meta.page <= 1}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(q.data.meta.page + 1)}
              disabled={!q.data.meta.hasMore}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
