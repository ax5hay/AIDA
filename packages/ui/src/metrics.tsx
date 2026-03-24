"use client";

import { motion } from "framer-motion";
import { cn } from "./cn";

export function KpiStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    delta?: string;
    tone?: "neutral" | "positive" | "warning" | "critical";
    hint?: string;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35 }}
          className={cn(
            "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur-sm",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]",
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{item.label}</p>
          <p className="mt-2 font-mono text-2xl font-medium tabular-nums text-white">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-zinc-500">{item.hint}</p> : null}
          {item.delta ? (
            <p
              className={cn(
                "mt-2 text-xs",
                item.tone === "positive" && "text-emerald-400",
                item.tone === "warning" && "text-amber-400",
                item.tone === "critical" && "text-rose-400",
                (!item.tone || item.tone === "neutral") && "text-zinc-500",
              )}
            >
              {item.delta}
            </p>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}

export function InsightCallout({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300/90">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{body}</p>
      {action ? (
        <a
          href={action.href}
          className="mt-3 inline-flex text-xs font-medium text-cyan-400 hover:text-cyan-300"
        >
          {action.label} →
        </a>
      ) : null}
    </div>
  );
}
