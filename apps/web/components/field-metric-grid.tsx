"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@aida/ui";

export const FieldMetricGrid = memo(function FieldMetricGrid({
  rows,
}: {
  rows: Array<{
    field: string;
    absolute: number;
    pctOfDenominator: number | null;
    denominator: number | null;
    denominatorNote?: string;
  }>;
}) {
  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">What this is:</span> Field metric cards.{" "}
        <span className="font-medium text-zinc-300">What it does:</span> shows counts and, when defined, the percentage of
        that count against the denominator named in each card (see the small caption — rules differ by section).
      </p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, i) => (
          <motion.div
            key={row.field}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.015, 0.4) }}
            className={cn(
              "rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5",
              "flex flex-col gap-1",
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {row.field.replace(/_/g, " ")}
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-lg tabular-nums text-white">{row.absolute}</span>
              {row.pctOfDenominator !== null ? (
                <span className="text-xs tabular-nums text-cyan-400/90">{row.pctOfDenominator.toFixed(1)}%</span>
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>
            {row.denominator !== null ? (
              <span className="text-[10px] leading-snug text-zinc-500">
                <span className="text-zinc-600">Denom </span>
                <span className="font-mono tabular-nums text-zinc-400">{row.denominator}</span>
              </span>
            ) : null}
            {row.denominatorNote ? (
              <span className="text-[10px] leading-snug text-zinc-600">{row.denominatorNote}</span>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
});
