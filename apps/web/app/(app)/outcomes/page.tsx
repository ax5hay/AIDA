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
import { useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";
import { analyticsFilteredQuery } from "@/lib/analytics-query";

export default function OutcomesPage() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["section", "delivery_and_outcomes", filtersKey],
    queryFn: ({ signal }) => getSection("delivery_and_outcomes", filters, signal),
    ...analyticsFilteredQuery,
  });

  const mat = useQuery({
    queryKey: ["anomalies", "maternal_deaths", filtersKey],
    queryFn: ({ signal }) => getAnomalies("maternal_deaths", filters, signal),
    ...analyticsFilteredQuery,
  });

  return (
    <PageShell
      title="Outcomes & mortality"
      eyebrow="Delivery → births → deaths"
      subtitle="Mortality rates in the overview use live_births as denominator. Use anomalies to find outlier facilities."
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
              |z| &gt; {mat.data?.thresholdZ ?? 2.5} (same filters as charts)
            </p>
            {mat.isLoading ? (
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            ) : mat.data && mat.data.points.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {mat.data.points.map((p) => (
                  <li key={`${p.assessmentId}-${p.index}`} className="flex flex-wrap gap-2">
                    <span className="font-mono text-rose-400/90">z={p.z.toFixed(2)}</span>
                    <span>maternal_deaths={p.value}</span>
                    <span>{p.facility}</span>
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
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No maternal death anomalies in selection.</p>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
