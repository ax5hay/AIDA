"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, InsightCallout, Section } from "@aida/ui";
import { getAnomalies, getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { TABLE_PAGE_SIZE_OPTIONS, parseTablePageSize, type TablePageSize } from "@/lib/table-pagination";

export default function OutcomesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qs = searchParams.toString();
  const matPage = Math.max(1, Number(searchParams.get("matPage") ?? "1") || 1);
  const matPageSize = parseTablePageSize(searchParams.get("matPageSize"), 10);
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["section", "delivery_and_outcomes", filtersKey],
    queryFn: ({ signal }) => getSection("delivery_and_outcomes", filters, signal),
    ...analyticsFilteredQuery,
  });

  const mat = useQuery({
    queryKey: ["anomalies", "maternal_deaths", filtersKey, matPage, matPageSize],
    queryFn: ({ signal }) =>
      getAnomalies("maternal_deaths", filters, { signal, page: matPage, pageSize: matPageSize }),
    ...analyticsFilteredQuery,
  });

  const setMatPage = (next: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next <= 1) p.delete("matPage");
    else p.set("matPage", String(next));
    p.set("matPageSize", String(matPageSize));
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  };

  const setMatPageSize = (next: TablePageSize) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("matPageSize", String(next));
    p.delete("matPage");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  };

  return (
    <PageShell
      title="Outcomes & mortality"
      eyebrow="Delivery → births → deaths"
      subtitle="Rates use live births as denominator where noted. Field cards show numerator vs denominator; distribution bars show share within the delivery section."
      explainer={{
        what: "Outcome counts and mortality-linked signals from the delivery_and_outcomes table.",
        does: "Shows summed metrics, comparative shares within the section, trends over time, and z-score outliers for maternal deaths.",
      }}
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <InsightCallout
        title="Operational interpretation"
        body="Rising early_neonatal_deaths_lt_24hrs with flat live_births suggests perinatal resuscitation or referral timing — not just volume."
      />

      {q.error ? (
        <p className="mt-6 text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-white/5" />
      ) : q.data ? (
        <div className="mt-8 space-y-8">
          <Section title="Delivery & outcomes">
            <FieldMetricGrid rows={q.data.fieldMetrics} />
            <div className="mt-6">
              <ComparativeDistribution slices={q.data.comparativeDistribution} />
            </div>
            <div className="mt-6">
              <SectionLineChart title="Outcome trajectories" series={q.data.timeSeries} />
            </div>
          </Section>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white">Maternal deaths — anomalies</h3>
            <p className="mt-1 text-xs text-zinc-500">
              |z| &gt; {mat.data?.thresholdZ ?? 2.5} (same filters as charts). Each row is numerator maternal_deaths at
              that assessment; cohort is all filtered values for z-scoring.
            </p>
            {mat.isLoading ? (
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            ) : mat.data && mat.data.points.length > 0 ? (
              <>
                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  {mat.data.points.map((p) => (
                    <li key={`${p.assessmentId}-${p.index}`} className="flex flex-wrap gap-2">
                      <span className="font-mono text-rose-400/90">z={p.z.toFixed(2)}</span>
                      <span>
                        maternal_deaths={p.value} · {p.facility}
                      </span>
                      {p.assessmentId ? (
                        <Link
                          href={withQueryString(`/explorer/${p.assessmentId}`, qs)}
                          className="text-cyan-400/80"
                        >
                          Record
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4 text-sm text-zinc-400">
                  <span>
                    Page {mat.data.meta.page} of {mat.data.meta.totalPages} · {mat.data.meta.total} outliers
                  </span>
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="shrink-0">Rows per page</span>
                    <select
                      value={matPageSize}
                      onChange={(e) => setMatPageSize(Number(e.target.value) as TablePageSize)}
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
                    disabled={mat.data.meta.page <= 1}
                    onClick={() => setMatPage(mat.data!.meta.page - 1)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!mat.data.meta.hasMore}
                    onClick={() => setMatPage(mat.data!.meta.page + 1)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No maternal death anomalies in selection.</p>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
