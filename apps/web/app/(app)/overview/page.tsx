"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, KpiStrip, InsightCallout } from "@aida/ui";
import { getAnomalies, getOverview } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["overview", filtersKey],
    queryFn: ({ signal }) => getOverview(filters, signal),
  });

  const anomalies = useQuery({
    queryKey: ["anomalies", "live_births", filtersKey],
    queryFn: ({ signal }) => getAnomalies("live_births", filters, signal),
  });

  if (q.isLoading) {
    return (
      <PageShell title="Program overview" eyebrow="Decision intelligence" subtitle="Loading…">
        <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </PageShell>
    );
  }

  if (q.isError || !q.data) {
    return (
      <PageShell title="Program overview" eyebrow="Decision intelligence" subtitle="API error">
        <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
        <p className="text-sm text-rose-400">{(q.error as Error)?.message ?? "Unknown error"}</p>
      </PageShell>
    );
  }

  const d = q.data;
  const sr = d.kpis.screening_rates;
  const mat = d.kpis.mortality_rate_maternal_per_live_birth;
  const inst = d.kpis.institutional_delivery_ratio;

  return (
    <PageShell
      title="Program overview"
      eyebrow="Decision intelligence"
      subtitle="Signals prioritized for action: screening coverage, management gaps, and mortality risk. Filters apply to every KPI below."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <p className="mb-6 text-xs text-zinc-500">
        Active window: {d.meta.assessmentCount} assessments
        {d.meta.filters.from || d.meta.filters.to || d.meta.filters.district || d.meta.filters.facilityId
          ? ` · filters ${JSON.stringify(d.meta.filters)}`
          : " · full corpus"}
      </p>

      <KpiStrip
        items={[
          {
            label: "Assessments in view",
            value: String(d.meta.assessmentCount),
            hint: "Rows after filters",
          },
          {
            label: "HIV screening rate (ANC)",
            value: sr.screening_rate_hiv != null ? `${(sr.screening_rate_hiv * 100).toFixed(1)}%` : "n/a",
            tone:
              sr.screening_rate_hiv != null && sr.screening_rate_hiv < 0.85 ? "warning" : "neutral",
            delta:
              sr.screening_rate_hiv != null && sr.screening_rate_hiv < 0.85
                ? "Below 85% — expand testing access"
                : undefined,
          },
          {
            label: "Maternal deaths / live births",
            value: mat != null ? mat.toFixed(5) : "n/a",
            tone: mat != null && mat > 0.002 ? "critical" : "neutral",
            delta:
              mat != null && mat > 0.002
                ? "Escalate referral & facility delivery pathways"
                : undefined,
          },
          {
            label: "Institutional delivery ratio",
            value: inst != null ? `${(inst * 100).toFixed(1)}%` : "n/a",
            hint: "(facility + other) / all delivery sites",
          },
        ]}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
        >
          <h3 className="text-sm font-medium text-white">Action queue</h3>
          <ul className="mt-4 space-y-3">
            {d.alerts.length === 0 ? (
              <li className="text-sm text-zinc-500">No threshold breaches in current filters.</li>
            ) : (
              d.alerts.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed text-zinc-300">
                  <span className="text-zinc-500">[{a.severity}]</span> {a.action}
                </li>
              ))
            )}
          </ul>
        </motion.div>

        <InsightCallout
          title="Next step"
          body="Triage by highest gap: compare management_gap for pregnancy vs screening_rate for ANC labs. Low hemoglobin_tested_4_times with adequate registration implies a phlebotomy cadence problem, not enrollment."
          action={{ label: "Open pregnancy analytics", href: withQueryString("/pregnancy", qs) }}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={withQueryString("/analytics", qs)}
          className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/10"
        >
          Open analytics suite →
        </Link>
        <Link
          href={withQueryString("/correlations", qs)}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]"
        >
          Correlation matrix
        </Link>
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-white">Live births — statistical anomalies</h3>
          <p className="text-xs text-zinc-500">
            |z| &gt; {anomalies.data?.thresholdZ ?? 2.5} vs cohort (same filters)
          </p>
        </div>
        {anomalies.isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading anomalies…</p>
        ) : anomalies.data && anomalies.data.points.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            {anomalies.data.points.slice(0, 8).map((p) => (
              <li key={`${p.assessmentId}-${p.index}`} className="flex flex-wrap gap-2">
                <span className="font-mono text-cyan-400/90">z={p.z.toFixed(2)}</span>
                <span>
                  value={p.value} · {p.facility ?? "facility"}
                </span>
                {p.assessmentId ? (
                  <Link
                    href={withQueryString(`/explorer/${p.assessmentId}`, qs)}
                    className="text-cyan-400/80 hover:text-cyan-300"
                  >
                    Open record
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No anomalies in current selection.</p>
        )}
      </div>

      {d.validation.issues.length > 0 ? (
        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/90">
          <p className="font-medium">Validation flags in source data</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-200/80">
            {d.validation.issues.slice(0, 12).map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
          {d.validation.issues.length > 12 ? (
            <p className="mt-2 text-xs text-amber-200/60">
              +{d.validation.issues.length - 12} more — use Data Explorer to inspect rows.
            </p>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
