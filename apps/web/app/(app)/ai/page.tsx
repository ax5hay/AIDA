"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PageShell, InsightCallout } from "@aida/ui";
import {
  getAiModels,
  getAiStatus,
  getIntelligence,
  getOverview,
  getPublicConfig,
  postAiInsights,
  postAiIntelligenceInsights,
} from "@/lib/api";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { AiNarrative } from "@/components/ai-narrative";
import { AiMitigationPanel } from "@/components/ai-mitigation-panel";
import { useAiPreferences } from "@/hooks/use-ai-preferences";
import { useEffect, useState } from "react";
import { cn } from "@aida/ui";
import { analyticsFilteredQuery } from "@/lib/analytics-query";

export default function AiPage() {
  const { filters, setFilters, clearFilters, filtersKey } = useAnalyticsFilters();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intelText, setIntelText] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);

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
    ...analyticsFilteredQuery,
  });

  const intelligence = useQuery({
    queryKey: ["intelligence", filtersKey],
    queryFn: ({ signal }) => getIntelligence(filters, signal),
    ...analyticsFilteredQuery,
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
      if (d.llmError) {
        setError(d.llmError);
        setText(null);
        return;
      }
      setError(null);
      setText(d.text);
    },
    onError: (e: Error) => {
      setError(e.message);
      setText(null);
    },
  });

  const mIntel = useMutation({
    mutationFn: () =>
      postAiIntelligenceInsights(intelligence.data ?? {}, {
        model: config.data?.lmStudioConfigured ? selectedModel : undefined,
      }),
    onSuccess: (d) => {
      if (d.llm) {
        setIntelError(null);
        setIntelText(d.llm);
        return;
      }
      if (d.llmError) {
        setIntelError(d.llmError);
        setIntelText(null);
        return;
      }
      setIntelError(null);
      if (!d.enabled) {
        setIntelText(
          "Server AI is disabled. Full deterministic intelligence (pipelines, gaps, what/why/next) is available from the Analytics suite without an LLM.",
        );
        return;
      }
      setIntelText(
        "LLM returned no text. Expand the Analytics suite public health section for the full JSON, or retry with a different model.",
      );
    },
    onError: (e: Error) => {
      setIntelError(e.message);
      setIntelText(null);
    },
  });

  const serverOn = status.data?.enabled === true;
  const canGenerate =
    hydrated && serverOn && clientAiEnabled && !!overview.data && !m.isPending;
  const canGenerateIntel =
    hydrated && serverOn && clientAiEnabled && !!intelligence.data && !mIntel.isPending;

  return (
    <PageShell
      title="AI insights"
      eyebrow="Optional GenAI layer"
      subtitle="Narrative synthesis uses the same filtered snapshots as the dashboard: program overview and/or the full public health intelligence bundle. Counts always come from the API response, not the model."
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

      <div className="mt-6 flex min-h-[52px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => m.mutate()}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-cyan-500/20 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="px-1">Generate narrative from filtered overview</span>
        </button>
        <button
          type="button"
          disabled={!canGenerateIntel}
          onClick={() => mIntel.mutate()}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-violet-500/30 bg-violet-950/40 px-5 text-sm font-medium text-violet-100 transition hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="px-1">Generate narrative from intelligence snapshot</span>
        </button>
        {m.isPending ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            Overview…
          </div>
        ) : null}
        {mIntel.isPending ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
            Intelligence…
          </div>
        ) : null}
      </div>

      {overview.isLoading || intelligence.isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading overview and intelligence snapshots…</p>
      ) : overview.error ? (
        <p className="mt-6 text-sm text-rose-400">{(overview.error as Error).message}</p>
      ) : intelligence.error ? (
        <p className="mt-6 text-sm text-rose-400">{(intelligence.error as Error).message}</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-rose-400">{error}</p>
      ) : text ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-black/40 p-5">
          <AiNarrative text={text} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          {!serverOn
            ? "Set AI_INSIGHTS_ENABLED=true and configure LM_STUDIO_BASE_URL or OPENAI_API_KEY on the API host."
            : !clientAiEnabled
              ? "AI generation is turned off in this browser."
              : "Run overview generation to produce an executive-style narrative for the current filters."}
        </p>
      )}
      <AiMitigationPanel
        mitigation={m.data?.mitigation}
        title="Overview — prompt shaping"
        accent="cyan"
        className="mt-4"
      />

      {intelError ? (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-rose-400">{intelError}</p>
          <p className="text-xs text-zinc-500">
            Deterministic blocks are still in Analytics → Public health intelligence. The panel below shows what was
            sent to the model after server-side shortening.
          </p>
        </div>
      ) : intelText ? (
        <div className="mt-8 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-400/90">Intelligence narrative</p>
          <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-5">
            <AiNarrative text={intelText} />
          </div>
        </div>
      ) : null}
      <AiMitigationPanel
        mitigation={mIntel.data?.mitigation}
        title="Intelligence — prompt shaping"
        accent="violet"
        className="mt-4"
      />
    </PageShell>
  );
}
