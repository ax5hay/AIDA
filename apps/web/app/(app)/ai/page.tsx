"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PageShell, InsightCallout } from "@aida/ui";
import { getAiStatus, getOverview, postAiInsights } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useState } from "react";

export default function AiPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["ai-status"],
    queryFn: ({ signal }) => getAiStatus(signal),
  });

  const overview = useQuery({
    queryKey: ["overview", filtersKey],
    queryFn: ({ signal }) => getOverview(filters, signal),
  });

  const m = useMutation({
    mutationFn: () => postAiInsights(overview.data ?? {}),
    onSuccess: (d) => {
      setError(null);
      setText(d.text);
    },
    onError: (e: Error) => {
      setError(e.message);
      setText(null);
    },
  });

  return (
    <PageShell
      title="AI insights"
      eyebrow="Optional GenAI layer"
      subtitle="Narrative synthesis uses the same filtered overview payload as the dashboard. Counts always come from the API response, not the model."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <InsightCallout
        title="Privacy & governance"
        body="Route LM Studio locally for PHI-sensitive deployments. Disable AI_INSIGHTS_ENABLED if policy requires deterministic-only reporting."
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
          LLM status:{" "}
          <span className="text-white">{status.data?.enabled ? "enabled" : "disabled"}</span>
        </span>
        <button
          type="button"
          disabled={m.isPending || !overview.data}
          onClick={() => m.mutate()}
          className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-40"
        >
          {m.isPending ? "Generating…" : "Generate narrative from filtered overview"}
        </button>
      </div>

      {overview.isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading overview snapshot…</p>
      ) : overview.error ? (
        <p className="mt-6 text-sm text-rose-400">{(overview.error as Error).message}</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-rose-400">{error}</p>
      ) : text ? (
        <pre className="mt-8 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-5 text-sm leading-relaxed text-zinc-300">
          {text}
        </pre>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          {status.data?.enabled
            ? "Run generation to produce an executive-style narrative for the current filters."
            : "Set AI_INSIGHTS_ENABLED=true and configure LM_STUDIO_BASE_URL or OPENAI_API_KEY on the API host."}
        </p>
      )}
    </PageShell>
  );
}
