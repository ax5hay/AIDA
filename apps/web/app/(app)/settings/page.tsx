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

  const publicUrl =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1" : "";

  return (
    <PageShell
      title="Settings"
      eyebrow="Environment"
      subtitle="Resolved configuration from the API (read-only). The web client only knows NEXT_PUBLIC_* at build time; server flags are authoritative."
    >
      {q.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      ) : q.error ? (
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
      ) : q.data ? (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">API bundle</p>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">apiVersion</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{q.data.apiVersion}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">defaultApiBase</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{q.data.defaultApiBase}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">webOrigin (CORS)</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{q.data.webOrigin ?? "not set"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">aiInsightsEnabled</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{String(q.data.aiInsightsEnabled)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">aiProviderReady</dt>
                <dd className="font-mono text-xs text-cyan-400/90">{String(q.data.aiProviderReady)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Browser (NEXT_PUBLIC)</p>
            <p className="mt-3 font-mono text-xs text-zinc-300">
              NEXT_PUBLIC_API_URL → {publicUrl || "(hydrating…)"}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Change requires rebuild of the web app. Point this at your deployed API base including{" "}
              <code className="text-zinc-400">/v1</code>.
            </p>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
