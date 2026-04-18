"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { getPublicConfig } from "@/lib/api";

export default function SettingsPage() {
  const q = useQuery({
    queryKey: ["public-config"],
    queryFn: ({ signal }) => getPublicConfig(signal),
    staleTime: 120_000,
  });

  return (
    <PageShell
      title="Settings"
      eyebrow="Environment"
      subtitle="What is enabled for your deployment. Programme teams do not change connectivity or hosting from this screen — contact your administrator if something looks wrong."
    >
      {q.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      ) : q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.data ? (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Service</p>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">Version label</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{q.data.apiVersion}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">Narrative insights</dt>
                <dd className="text-xs text-zinc-200">{q.data.aiInsightsEnabled ? "On" : "Off"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Insight provider ready</dt>
                <dd className="text-xs text-zinc-200">{q.data.aiProviderReady ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
