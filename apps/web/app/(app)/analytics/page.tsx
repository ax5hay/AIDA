"use client";

import { PageShell } from "@aida/ui";
import { AnalyticsSuite } from "@/components/analytics-suite";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";

export default function AnalyticsHubPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  return (
    <PageShell
      title="Analytics suite"
      eyebrow="Deterministic intelligence"
      subtitle="District rollups, correlation heatmaps, scatter cohorts, funnel mass-balance, and flow — all driven by the same filtered assessment window as the rest of AIDA."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
      <AnalyticsSuite filters={filters} filtersKey={filtersKey} />
    </PageShell>
  );
}
