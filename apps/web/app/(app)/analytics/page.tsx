"use client";

import dynamic from "next/dynamic";
import { PageShell } from "@aida/ui";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";

const AnalyticsSuite = dynamic(
  () => import("@/components/analytics-suite").then((m) => ({ default: m.AnalyticsSuite })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 pt-2">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
      </div>
    ),
  },
);

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
