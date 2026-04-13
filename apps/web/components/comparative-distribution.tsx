"use client";

import { memo } from "react";
import type { ComparativeSlice } from "@/lib/types";
import { motion } from "framer-motion";

export const ComparativeDistribution = memo(function ComparativeDistribution({
  slices,
}: {
  slices: ComparativeSlice[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">What this is:</span> Distribution bars.{" "}
        <span className="font-medium text-zinc-300">What it does:</span> shows each field&apos;s share of the section
        total (not ANC coverage unless explicitly stated).
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {slices.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.25) }}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
              <span className="truncate">{s.label.replace(/_/g, " ")}</span>
              <span className="shrink-0 font-mono tabular-nums text-zinc-400">
                {Number.isFinite(s.shareOfSection) ? `${s.shareOfSection.toFixed(1)}%` : "n/a"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-indigo-500/80"
                style={{
                  width: `${Number.isFinite(s.shareOfSection) ? Math.min(100, Math.max(0, s.shareOfSection)) : 0}%`,
                }}
              />
            </div>
            <p className="mt-1 font-mono text-xs tabular-nums text-zinc-400">n = {s.absolute}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
