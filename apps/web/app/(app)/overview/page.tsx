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
import { analyticsFilteredQuery } from "@/lib/analytics-query";

function pct(num: number, den: number, digits = 1) {
  if (!den || den <= 0) return "n/a";
  return `${((num / den) * 100).toFixed(digits)}%`;
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["overview", filtersKey],
    queryFn: ({ signal }) => getOverview(filters, signal),
    ...analyticsFilteredQuery,
  });

  const anomalies = useQuery({
    queryKey: ["anomalies", "live_births", filtersKey],
    queryFn: ({ signal }) => getAnomalies("live_births", filters, { signal, page: 1, pageSize: 8 }),
    ...analyticsFilteredQuery,
  });

  if (q.isLoading) {
    return (
      <PageShell
        title="Program overview"
        eyebrow="Decision intelligence"
        subtitle="Loading…"
        explainer={{
          what: "A single executive snapshot of everything in the database that matches your filters.",
          does: "Shows facility and time coverage, section completeness, core rates with explicit numerators and denominators, and where to drill in next.",
        }}
      >
        <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </PageShell>
    );
  }

  if (q.isError || !q.data) {
    return (
      <PageShell title="Program overview" eyebrow="Decision intelligence" subtitle="Could not load overview">
        <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
        <p className="text-sm text-rose-400">{(q.error as Error)?.message ?? "Unknown error"}</p>
      </PageShell>
    );
  }

  const d = q.data;
  const sr = d.kpis.screening_rates;
  const mat = d.kpis.mortality_rate_maternal_per_live_birth;
  const inst = d.kpis.institutional_delivery_ratio;
  const neo = d.kpis.early_neonatal_mortality_rate_per_live_birth;
  const anc = d.corpus.ancNumerators;
  const od = d.corpus.outcomeDenominators;
  const cov = d.corpus.sectionCoverage;

  return (
    <PageShell
      title="Program overview"
      eyebrow="Decision intelligence"
      subtitle="One place to see how much data you have, where it sits in time and geography, and how key programme rates look — every percentage below names its denominator."
      explainer={{
        what: "The executive dashboard for facility assessments matching your filters.",
        does: "Aggregates all matching monthly facility rows: coverage, ANC screening numerators over Σ total_anc_registered, and outcome events over live births where applicable.",
      }}
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Data footprint (this filter)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] text-zinc-500">Assessments</p>
            <p className="font-mono text-lg text-white">{d.meta.assessmentCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Facilities</p>
            <p className="font-mono text-lg text-white">{d.meta.facilityCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Districts represented</p>
            <p className="font-mono text-lg text-white">{d.meta.districtCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Reporting period (rows)</p>
            <p className="font-mono text-sm text-zinc-200">
              {d.meta.periodStartMin ?? "—"} → {d.meta.periodStartMax ?? "—"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Section presence (rows with each block non-null): preconception id / int / managed{" "}
          <span className="font-mono text-zinc-400">
            {cov.preconception_women_identified}/{cov.preconception_interventions}/{cov.preconception_women_managed}
          </span>
          {" · "}ANC registered{" "}
          <span className="font-mono text-zinc-400">{cov.pregnant_women_registered_and_screened}</span>
          {" · "}delivery & outcomes <span className="font-mono text-zinc-400">{cov.delivery_and_outcomes}</span>
        </p>
      </div>

      <KpiStrip
        items={[
          {
            label: "Σ ANC registered (numerator pool)",
            value: String(anc.denominator_total_anc_registered),
            hint: "Sum of total_anc_registered across filtered rows — denominator for ANC screening %.",
          },
          {
            label: "HIV tested / Σ ANC",
            value: sr.screening_rate_hiv != null ? `${(sr.screening_rate_hiv * 100).toFixed(1)}%` : "n/a",
            denominator: `${anc.hiv_tested} / ${anc.denominator_total_anc_registered}`,
            tone:
              sr.screening_rate_hiv != null && sr.screening_rate_hiv < 0.85 ? "warning" : "neutral",
            delta:
              sr.screening_rate_hiv != null && sr.screening_rate_hiv < 0.85
                ? "Below 85% — expand testing access"
                : undefined,
          },
          {
            label: "Hb ×4 / Σ ANC",
            value: sr.screening_rate_hgb_4x != null ? `${(sr.screening_rate_hgb_4x * 100).toFixed(1)}%` : "n/a",
            denominator: `${anc.hemoglobin_tested_4_times} / ${anc.denominator_total_anc_registered}`,
            tone:
              sr.screening_rate_hgb_4x != null && sr.screening_rate_hgb_4x < 0.75 ? "warning" : "neutral",
            delta:
              sr.screening_rate_hgb_4x != null && sr.screening_rate_hgb_4x < 0.75
                ? "Strengthen trimester Hb cadence"
                : undefined,
          },
          {
            label: "Maternal deaths / live births",
            value: mat != null ? `${(mat * 100).toFixed(3)}%` : "n/a",
            denominator: `${od.maternal_deaths} / ${od.live_births}`,
            tone: mat != null && mat > 0.002 ? "critical" : "neutral",
            delta:
              mat != null && mat > 0.002
                ? "Escalate referral & facility delivery pathways"
                : undefined,
          },
          {
            label: "Early neonatal deaths / live births",
            value: neo != null ? `${(neo * 100).toFixed(3)}%` : "n/a",
            denominator: `${od.early_neonatal_deaths_lt_24hrs} / ${od.live_births}`,
          },
          {
            label: "Institutional delivery ratio",
            value: inst != null ? `${(inst * 100).toFixed(1)}%` : "n/a",
            hint: "(facility + other institutional) ÷ all delivery sites — same rule as the institutional delivery KPI in Analytics.",
          },
          {
            label: "LBW / live births",
            value: d.kpis.lbw_rate != null ? `${(d.kpis.lbw_rate * 100).toFixed(1)}%` : "n/a",
            denominator: `${od.lbw_lt_2500g} / ${od.live_births}`,
          },
          {
            label: "Preterm / live births",
            value: d.kpis.preterm_rate != null ? `${(d.kpis.preterm_rate * 100).toFixed(1)}%` : "n/a",
            denominator: `${od.preterm_births_lt_37_weeks} / ${od.live_births}`,
          },
        ]}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase text-zinc-500">Preconception funnel (sums)</p>
          <p className="mt-2 text-sm text-zinc-300">
            Identified <span className="font-mono text-cyan-400/90">{d.funnel.preconception.identified_total}</span>
            {" · "}
            Managed <span className="font-mono text-cyan-400/90">{d.funnel.preconception.managed_total}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Managed % of identified (same field family):{" "}
            {d.funnel.preconception.identified_total > 0
              ? pct(d.funnel.preconception.managed_total, d.funnel.preconception.identified_total)
              : "n/a"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase text-zinc-500">Pregnancy (sums)</p>
          <p className="mt-2 text-sm text-zinc-300">
            Σ ANC reg. <span className="font-mono text-cyan-400/90">{d.funnel.pregnancy.registered_total}</span>
            {" · "}Identified {d.funnel.pregnancy.identified_total} · Managed {d.funnel.pregnancy.managed_total}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[11px] font-medium uppercase text-zinc-500">Outcomes (sums)</p>
          <p className="mt-2 text-sm text-zinc-300">
            Live births <span className="font-mono text-cyan-400/90">{d.funnel.outcomes.live_births}</span>
            {" · "}Maternal deaths {d.funnel.outcomes.maternal_deaths} · Early NND{" "}
            {d.funnel.outcomes.early_neonatal_deaths_lt_24hrs}
          </p>
        </div>
      </div>

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
          Correlation & intervention view
        </Link>
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-white">Live births — statistical anomalies</h3>
          <p className="text-xs text-zinc-500">
            |z| &gt; {anomalies.data?.thresholdZ ?? 2.5} vs cohort · showing page{" "}
            {anomalies.data?.meta.page ?? 1} of {anomalies.data?.meta.totalPages ?? 1} (
            {anomalies.data?.meta.total ?? 0} flags)
          </p>
        </div>
        {anomalies.isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading anomalies…</p>
        ) : anomalies.data && anomalies.data.points.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            {anomalies.data.points.map((p) => (
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
