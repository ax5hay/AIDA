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
      subtitle="Program-wide analytics for every section in the database that matches your filters: intelligence pipelines, KPI evidence, district rollups, paired scatters, and correlation matrices — not a single-topic dashboard."
      explainer={{
        what: "The deep analytics workspace for the full filtered facility assessment corpus.",
        does: "Layers modules (intelligence → KPIs → districts → scatters → matrix) so you can move from narrative signals to numeric proof using consistent denominators.",
      }}
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
      <AnalyticsSuite filters={filters} filtersKey={filtersKey} />
    </PageShell>
  );
}
