"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, Section } from "@aida/ui";
import { getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";

export default function InfantsPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["section", "infants_0_to_24_months", filtersKey],
    queryFn: ({ signal }) => getSection("infants_0_to_24_months", filters, signal),
  });

  return (
    <PageShell
      title="Infant intelligence"
      eyebrow="0–24 months"
      subtitle="Growth, micronutrients, immunization — compare inadequate weight gain bands to intervention coverage."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : q.data ? (
        <div className="space-y-8">
          <Section title="Field metrics">
            <FieldMetricGrid rows={q.data.fieldMetrics} />
            <div className="mt-6">
              <ComparativeDistribution slices={q.data.comparativeDistribution} />
            </div>
          </Section>
          <Section title="Trends">
            <SectionLineChart title="Infant programme indicators" series={q.data.timeSeries} />
          </Section>
        </div>
      ) : null}
    </PageShell>
  );
}
