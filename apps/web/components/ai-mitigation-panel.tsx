"use client";

import type { PromptMitigationReportDto } from "@/lib/types";
import { cn } from "@aida/ui";

type Props = {
  mitigation?: PromptMitigationReportDto;
  title?: string;
  accent?: "cyan" | "violet";
  className?: string;
};

/**
 * Shows what the API sent to the LLM after structured shortening (vs raw snapshot size).
 */
export function AiMitigationPanel({ mitigation, title = "Prompt shaping", accent = "cyan", className }: Props) {
  if (!mitigation) return null;
  const border = accent === "violet" ? "border-violet-500/25 bg-violet-950/15" : "border-cyan-500/25 bg-cyan-950/10";
  const label = accent === "violet" ? "text-violet-300/90" : "text-cyan-300/90";

  return (
    <div className={cn("rounded-xl border p-4 text-xs", border, className)}>
      <p className={cn("font-semibold uppercase tracking-wide", label)}>{title}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Raw snapshot (chars)</dt>
          <dd className="font-mono text-zinc-200">{mitigation.originalChars.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Sent to model (chars)</dt>
          <dd className="font-mono text-zinc-200">{mitigation.sentChars.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Est. user JSON tokens</dt>
          <dd className="font-mono text-zinc-200">~{mitigation.estimatedUserTokens}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Est. full prompt tokens</dt>
          <dd className="font-mono text-zinc-200">~{mitigation.estimatedFullPromptTokens}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Budget (chars / ~tok)</dt>
          <dd className="font-mono text-zinc-200">
            {mitigation.budgetChars.toLocaleString()} / ~{mitigation.budgetTokensApprox}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Assumed LLM context</dt>
          <dd className="font-mono text-zinc-200">
            n_ctx≈{mitigation.llmContextTokens} (reserve ~{mitigation.reserveTokens} for system + completion)
          </dd>
        </div>
      </dl>
      {mitigation.steps.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">What was reduced</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-400">
            {mitigation.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {mitigation.omittedKeys.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400">Omitted or truncated paths</summary>
          <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-zinc-500">
            {mitigation.omittedKeys.join(" · ")}
          </p>
        </details>
      ) : null}
      <p className="mt-3 text-[11px] text-zinc-600">
        Tune <span className="font-mono text-zinc-500">AI_LLM_CONTEXT_TOKENS</span>,{" "}
        <span className="font-mono text-zinc-500">AI_USER_CONTENT_MAX_CHARS</span>, and related vars on the API host if
        your model has a larger context window.
      </p>
    </div>
  );
}
