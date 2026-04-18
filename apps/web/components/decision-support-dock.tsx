"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getDecisionSupport } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { analyticsFilteredQuery } from "@/lib/analytics-query";
import { cn } from "@aida/ui";
import { useAppNavRailOffsetClass } from "@/components/app-nav-context";

type Tab = "actions" | "score" | "alerts" | "whatif" | "quality" | "compare" | "story";

/** One label per tab; mobile uses the same copy (horizontal scroll on narrow screens). */
const TABS: Array<[Tab, string]> = [
  ["actions", "Actions"],
  ["score", "Score"],
  ["alerts", "Alerts"],
  ["whatif", "What-if"],
  ["quality", "Quality"],
  ["compare", "Benchmarks"],
  ["story", "Story"],
];

export function DecisionSupportDock() {
  const railOffsetClass = useAppNavRailOffsetClass();
  const { filters, filtersKey } = useAnalyticsFilters();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("actions");

  const q = useQuery({
    queryKey: ["decision-support", filtersKey],
    queryFn: ({ signal }) => getDecisionSupport(filters, signal),
    ...analyticsFilteredQuery,
    refetchInterval: 60_000,
  });

  const d = q.data;
  const score = d?.program_health_score;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[65] flex justify-center px-2 pt-1 sm:px-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0 ${railOffsetClass}`}
    >
      <div className="pointer-events-auto w-full max-w-4xl">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-h-[48px] w-full touch-manipulation items-center justify-between gap-2 rounded-t-2xl border border-white/15 border-b-0 bg-[#0c0d12]/95 px-3 py-3 text-left shadow-lg backdrop-blur-md backdrop-saturate-150 active:bg-white/[0.06] sm:min-h-0 sm:px-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-400/90">Decision support</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-200 sm:line-clamp-none sm:text-sm">
              {q.isLoading
                ? "Loading…"
                : score
                  ? `Health ${score.score}/100 · ${d?.top_actions?.length ?? 0} actions`
                  : "Tap for prioritized actions & alerts"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {score ? (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500/30 to-violet-600/20 sm:h-10 sm:w-10"
                aria-hidden
              >
                <span className="font-mono text-sm font-semibold text-white">{score.score}</span>
              </div>
            ) : null}
            <span className="flex h-10 w-8 items-center justify-center text-zinc-400" aria-hidden>
              {open ? "▼" : "▲"}
            </span>
          </div>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden rounded-b-2xl border border-t-0 border-white/15 bg-[#07080c]/98 shadow-2xl backdrop-blur-md"
            >
              {/* Scrollable tabs — thumb-friendly on narrow screens */}
              <div
                className="-mx-0 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-white/10 px-2 py-2 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Decision support sections"
              >
                {TABS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={cn(
                      "min-h-[44px] shrink-0 snap-start whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium touch-manipulation sm:min-h-0 sm:rounded-lg sm:py-1.5 sm:text-xs",
                      tab === id ? "bg-cyan-500/20 text-cyan-100" : "text-zinc-500 active:bg-white/10 sm:hover:bg-white/5",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="max-h-[min(65dvh,calc(100dvh-10rem))] overflow-y-auto overscroll-y-contain px-3 py-3 text-sm text-zinc-300 [-webkit-overflow-scrolling:touch] sm:max-h-[min(420px,55vh)] sm:px-4 sm:py-4"
              >
                {q.isLoading ? (
                  <p className="text-sm text-zinc-500">Loading decision layer…</p>
                ) : q.isError || !d ? (
                  <p className="text-sm text-rose-400">Could not load decision support.</p>
                ) : (
                  <>
                    {tab === "actions" && (
                      <ol className="space-y-3">
                        {d.top_actions.map((a) => (
                          <li key={a.rank} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                              {a.rank}. {a.signal}
                            </p>
                            <p className="mt-1 text-[15px] font-medium leading-snug text-white sm:text-sm">{a.title}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 sm:text-xs">{a.rationale}</p>
                          </li>
                        ))}
                      </ol>
                    )}

                    {tab === "score" && score && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <p className="font-mono text-4xl font-semibold leading-none text-white sm:text-5xl">{score.score}</p>
                          <p className="pb-0.5 text-xs text-zinc-500">/ 100 composite</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3 sm:gap-3">
                          {(
                            [
                              ["Coverage", score.breakdown.coverage],
                              ["Outcomes", score.breakdown.outcomes],
                              ["Gap equity", score.breakdown.gap_equity],
                            ] as const
                          ).map(([label, v]) => (
                            <div key={label}>
                              <div className="flex justify-between text-xs text-zinc-500">
                                <span>{label}</span>
                                <span>{v}</span>
                              </div>
                              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10 sm:h-2">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-violet-500/70"
                                  style={{ width: `${Math.min(100, v)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-500 sm:space-y-1 sm:text-xs">
                          {score.notes.map((n) => (
                            <li key={n} className="leading-relaxed">
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tab === "alerts" && (
                      <ul className="space-y-2">
                        {d.alert_center.map((al) => (
                          <li
                            key={al.id}
                            className={cn(
                              "rounded-xl border px-3 py-3 text-sm sm:py-2 sm:text-xs",
                              al.severity === "critical"
                                ? "border-rose-500/40 bg-rose-950/30"
                                : al.severity === "warning"
                                  ? "border-amber-500/30 bg-amber-950/20"
                                  : "border-white/10 bg-white/[0.03]",
                            )}
                          >
                            <p className="font-medium leading-snug text-zinc-200">{al.title}</p>
                            <p className="mt-1.5 leading-relaxed text-zinc-400">{al.detail}</p>
                            <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-600">{al.source}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {tab === "whatif" && (
                      <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-zinc-500 sm:text-xs">{d.what_if_disclaimer}</p>
                        {d.what_if.map((w) => (
                          <div key={w.id} className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3 sm:p-3">
                            <p className="text-[15px] font-medium leading-snug text-violet-200 sm:text-sm">{w.label}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 sm:text-xs">{w.assumption}</p>
                            <dl className="mt-3 grid grid-cols-1 gap-3 font-mono text-sm text-zinc-300 sm:grid-cols-3 sm:gap-2 sm:text-xs">
                              <div>
                                <dt className="text-zinc-600">HIV / ANC</dt>
                                <dd className="mt-0.5">
                                  {w.projected.hiv_screening_rate != null
                                    ? `${(w.projected.hiv_screening_rate * 100).toFixed(1)}%`
                                    : "n/a"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-zinc-600">LBW</dt>
                                <dd className="mt-0.5">
                                  {w.projected.lbw_rate != null ? `${(w.projected.lbw_rate * 100).toFixed(1)}%` : "n/a"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-zinc-600">Mat. mortality</dt>
                                <dd className="mt-0.5 break-all">{w.projected.maternal_mortality_rate?.toFixed(5) ?? "n/a"}</dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab === "quality" && (
                      <dl className="space-y-3 text-sm sm:space-y-2 sm:text-xs">
                        <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
                          <dt className="max-w-[85%] leading-snug text-zinc-400">Missing core sections (ANC or delivery)</dt>
                          <dd className="font-mono text-base text-cyan-200 sm:text-sm">
                            {(d.data_quality.missing_core_sections_pct * 100).toFixed(1)}%
                          </dd>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
                          <dt className="text-zinc-400">Validation issues</dt>
                          <dd className="font-mono text-base sm:text-sm">{d.data_quality.validation_issue_count}</dd>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
                          <dt className="max-w-[90%] leading-snug text-zinc-400">Suspicious flags (anomalies + cap)</dt>
                          <dd className="font-mono text-base sm:text-sm">{d.data_quality.suspicious_assessment_flags}</dd>
                        </div>
                        <p className="leading-relaxed text-zinc-500">{d.data_quality.inconsistent_rows_hint}</p>
                      </dl>
                    )}

                    {tab === "compare" && (
                      <div className="space-y-4 text-sm sm:text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="font-medium text-zinc-200">Current vs previous (half-window)</p>
                          <p className="mt-2 leading-relaxed text-zinc-400">
                            {(d.benchmarking as { current_vs_previous_half?: { narrative?: string } }).current_vs_previous_half
                              ?.narrative ?? "—"}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 p-3">
                            <p className="font-medium text-rose-200/90">Highest burden districts</p>
                            <ul className="mt-2 space-y-1.5 leading-snug text-zinc-400">
                              {(
                                (d.benchmarking as { region_vs_region?: { worst?: Array<{ district: string }> } })
                                  .region_vs_region?.worst ?? []
                              ).map((x) => (
                                <li key={x.district}>{x.district}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-white/10 p-3">
                            <p className="font-medium text-emerald-200/90">Lowest burden (same window)</p>
                            <ul className="mt-2 space-y-1.5 leading-snug text-zinc-400">
                              {(
                                (d.benchmarking as { region_vs_region?: { best?: Array<{ district: string }> } })
                                  .region_vs_region?.best ?? []
                              ).map((x) => (
                                <li key={x.district}>{x.district}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {tab === "story" && (
                      <ol className="space-y-3">
                        {d.story_mode.map((s) => (
                          <li key={s.step} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                              Step {s.step} — {s.title}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 sm:text-xs">{s.narrative}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </>
                )}
              </div>

              <p className="border-t border-white/10 px-3 py-2.5 text-center text-[10px] leading-snug text-zinc-600 sm:px-4 sm:py-2">
                Filters match URL · refresh ~{d?.meta.refresh_hint_sec ?? 60}s
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
