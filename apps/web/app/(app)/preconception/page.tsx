"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, Section } from "@aida/ui";
import { getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";

export default function PreconceptionPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const identified = useQuery({
    queryKey: ["section", "preconception_women_identified", filtersKey],
    queryFn: ({ signal }) => getSection("preconception_women_identified", filters, signal),
  });
  const managed = useQuery({
    queryKey: ["section", "preconception_women_managed", filtersKey],
    queryFn: ({ signal }) => getSection("preconception_women_managed", filters, signal),
  });
  const interventions = useQuery({
    queryKey: ["section", "preconception_interventions", filtersKey],
    queryFn: ({ signal }) => getSection("preconception_interventions", filters, signal),
  });

  const loading = identified.isLoading || managed.isLoading || interventions.isLoading;
  const err = identified.error || managed.error || interventions.error;

  return (
    <PageShell
      title="Preconception intelligence"
      eyebrow="Risk identification & coverage"
      subtitle="Identified vs managed are separate cohorts. Interventions sit between them — use comparative shares to see where burden concentrates."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      {err ? (
        <p className="text-sm text-rose-400">{(err as Error).message}</p>
      ) : loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="space-y-14">
          <Section title="Women identified" hint="Absolute counts & share of section total">
            {identified.data ? (
              <>
                <FieldMetricGrid rows={identified.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={identified.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Time series — all fields (toggle for full)" series={identified.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
          <Section title="Women managed" hint="Must not exceed identified counts (validated on ingest)">
            {managed.data ? (
              <>
                <FieldMetricGrid rows={managed.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={managed.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Time series" series={managed.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
          <Section title="Interventions" hint="IFA, nutrition, WASH counselling">
            {interventions.data ? (
              <>
                <FieldMetricGrid rows={interventions.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={interventions.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Time series" series={interventions.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
        </div>
      )}
    </PageShell>
  );
}
