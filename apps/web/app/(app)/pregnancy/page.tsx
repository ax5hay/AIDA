"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, InsightCallout, Section } from "@aida/ui";
import { getSection } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import { SectionLineChart } from "@/components/section-chart";
import { ComparativeDistribution } from "@/components/comparative-distribution";

export default function PregnancyPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const reg = useQuery({
    queryKey: ["section", "pregnant_women_registered_and_screened", filtersKey],
    queryFn: ({ signal }) => getSection("pregnant_women_registered_and_screened", filters, signal),
  });
  const id = useQuery({
    queryKey: ["section", "pregnant_women_identified", filtersKey],
    queryFn: ({ signal }) => getSection("pregnant_women_identified", filters, signal),
  });
  const man = useQuery({
    queryKey: ["section", "pregnant_women_managed", filtersKey],
    queryFn: ({ signal }) => getSection("pregnant_women_managed", filters, signal),
  });

  const loading = reg.isLoading || id.isLoading || man.isLoading;
  const err = reg.error || id.error || man.error;

  return (
    <PageShell
      title="Pregnancy intelligence"
      eyebrow="ANC screening → conditions → management"
      subtitle="Screening denominators use total_anc_registered. Percentages on screening fields are vs that total."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <InsightCallout
        title="How to read this"
        body="When hemoglobin_tested_4_times lags HIV testing, the bottleneck is likely lab cadence—not counseling. Pair with phlebotomy scheduling before scaling community outreach."
      />

      {err ? (
        <p className="mt-6 text-sm text-rose-400">{(err as Error).message}</p>
      ) : loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="mt-10 space-y-14">
          <Section title="Registered & screened">
            {reg.data ? (
              <>
                <FieldMetricGrid rows={reg.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={reg.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Screening time series (denominator = total_anc_registered per month)" series={reg.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
          <Section title="Conditions identified">
            {id.data ? (
              <>
                <FieldMetricGrid rows={id.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={id.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Time series" series={id.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
          <Section title="Conditions managed">
            {man.data ? (
              <>
                <FieldMetricGrid rows={man.data.fieldMetrics} />
                <div className="mt-6">
                  <ComparativeDistribution slices={man.data.comparativeDistribution} />
                </div>
                <div className="mt-6">
                  <SectionLineChart title="Time series" series={man.data.timeSeries} />
                </div>
              </>
            ) : null}
          </Section>
        </div>
      )}
    </PageShell>
  );
}
