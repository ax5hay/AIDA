"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, Section } from "@aida/ui";
import { getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";

export default function HighRiskPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["section", "high_risk_pregnancy", filtersKey],
    queryFn: ({ signal }) => getSection("high_risk_pregnancy", filters, signal),
  });

  return (
    <PageShell
      title="High-risk pregnancy"
      eyebrow="Stratified burden"
      subtitle="Multiple pregnancy, BOH, infections, other conditions — shares show where to allocate specialist capacity."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : q.data ? (
        <div className="space-y-8">
          <Section title="Risk composition">
            <FieldMetricGrid rows={q.data.fieldMetrics} />
            <div className="mt-6">
              <ComparativeDistribution slices={q.data.comparativeDistribution} />
            </div>
          </Section>
          <Section title="Over time">
            <SectionLineChart title="High-risk indicators" series={q.data.timeSeries} />
          </Section>
        </div>
      ) : null}
    </PageShell>
  );
}
