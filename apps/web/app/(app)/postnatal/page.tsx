"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, Section } from "@aida/ui";
import { getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";
import { analyticsFilteredQuery } from "@/lib/analytics-query";

export default function PostnatalPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["section", "postnatal_women", filtersKey],
    queryFn: ({ signal }) => getSection("postnatal_women", filters, signal),
    ...analyticsFilteredQuery,
  });

  return (
    <PageShell
      title="Postnatal intelligence"
      eyebrow="0–6 weeks continuum"
      subtitle="Every field maps to a service lever: visits, supplements, mental health, KMC."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : q.data ? (
        <div className="space-y-8">
          <Section title="Field metrics & distribution">
            <FieldMetricGrid rows={q.data.fieldMetrics} />
            <div className="mt-6">
              <ComparativeDistribution slices={q.data.comparativeDistribution} />
            </div>
          </Section>
          <Section title="Temporal trends">
            <SectionLineChart title="All postnatal indicators" series={q.data.timeSeries} />
          </Section>
        </div>
      ) : null}
    </PageShell>
  );
}
