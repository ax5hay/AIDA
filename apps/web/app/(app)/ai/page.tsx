"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PageShell, InsightCallout } from "@aida/ui";
import { getAiModels, getAiStatus, getOverview, getPublicConfig, postAiInsights } from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useAiPreferences } from "@/hooks/use-ai-preferences";
import { useEffect, useState } from "react";
import { cn } from "@aida/ui";

export default function AiPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: ({ signal }) => getPublicConfig(signal),
  });

  const {
    clientAiEnabled,
    setClientAiEnabled,
    selectedModel,
    setSelectedModel,
    hydrated,
  } = useAiPreferences(config.data?.defaultLmStudioModel ?? "local-model");

  const status = useQuery({
    queryKey: ["ai-status"],
    queryFn: ({ signal }) => getAiStatus(signal),
  });

  const models = useQuery({
    queryKey: ["ai-models"],
    queryFn: ({ signal }) => getAiModels(signal),
    enabled: hydrated && !!config.data?.lmStudioConfigured && clientAiEnabled,
  });

  const overview = useQuery({
    queryKey: ["overview", filtersKey],
    queryFn: ({ signal }) => getOverview(filters, signal),
  });

  useEffect(() => {
    const list = models.data?.data ?? [];
    if (list.length === 0) return;
    if (!list.some((m) => m.id === selectedModel)) {
      setSelectedModel(list[0]!.id);
    }
  }, [models.data, selectedModel, setSelectedModel]);

  const m = useMutation({
    mutationFn: () =>
      postAiInsights(overview.data ?? {}, {
        model: config.data?.lmStudioConfigured ? selectedModel : undefined,
      }),
    onSuccess: (d) => {
      setError(null);
      setText(d.text);
    },
    onError: (e: Error) => {
      setError(e.message);
      setText(null);
    },
  });

  const serverOn = status.data?.enabled === true;
  const canGenerate =
    hydrated && serverOn && clientAiEnabled && !!overview.data && !m.isPending;

  return (
    <PageShell
      title="AI insights"
      eyebrow="Optional GenAI layer"
      subtitle="Narrative synthesis uses the same filtered overview payload as the dashboard. Counts always come from the API response, not the model."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <InsightCallout
        title="Privacy & governance"
        body="Route LM Studio locally for PHI-sensitive deployments. You can disable generation in this UI without changing server env — the API still enforces AI_INSIGHTS_ENABLED."
      />

      <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 sm:p-5">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Enable AI generation (this browser)</p>
            <p className="mt-1 text-xs text-zinc-500">Stored locally. Turn off to hide model UI and block calls.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={clientAiEnabled}
            onClick={() => setClientAiEnabled(!clientAiEnabled)}
            className={cn(
              "relative h-8 w-14 shrink-0 rounded-full border transition",
              clientAiEnabled ? "border-cyan-500/40 bg-cyan-500/20" : "border-white/10 bg-white/5",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                clientAiEnabled ? "left-7" : "left-1",
              )}
            />
          </button>
        </label>

        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-sm font-medium text-white">LM Studio model</p>
          <p className="text-xs text-zinc-500">
            Loaded from <span className="font-mono text-zinc-400">GET /v1/models</span> via the API proxy.
          </p>
          <select
            className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200 disabled:opacity-40"
            disabled={!clientAiEnabled || !config.data?.lmStudioConfigured || models.isLoading}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {(models.data?.data?.length ? models.data.data : [{ id: selectedModel }]).map((x) => (
              <option key={x.id} value={x.id}>
                {x.id}
              </option>
            ))}
          </select>
          {!config.data?.lmStudioConfigured ? (
            <p className="text-xs text-amber-200/80">Set LM_STUDIO_BASE_URL on the API host to list models.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">
            Server AI:{" "}
            <span className="text-zinc-300">{serverOn ? "enabled" : "disabled"}</span>
            {" · "}
            Provider ready:{" "}
            <span className="text-zinc-300">{config.data?.aiProviderReady ? "yes" : "no"}</span>
          </p>
          <p className="text-[11px] text-zinc-600">
            Button label stays fixed while generating — progress is shown separately so text never overlaps.
          </p>
        </div>
      </div>

      <div className="mt-6 flex min-h-[52px] flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => m.mutate()}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-cyan-500/20 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="px-1">Generate narrative from filtered overview</span>
        </button>
        {m.isPending ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            Generating…
          </div>
        ) : null}
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
          {!serverOn
            ? "Set AI_INSIGHTS_ENABLED=true and configure LM_STUDIO_BASE_URL or OPENAI_API_KEY on the API host."
            : !clientAiEnabled
              ? "AI generation is turned off in this browser."
              : "Run generation to produce an executive-style narrative for the current filters."}
        </p>
      )}
    </PageShell>
  );
}
