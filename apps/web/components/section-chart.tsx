"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#38bdf8",
  "#c084fc",
  "#4ade80",
  "#facc15",
  "#f97316",
  "#e879f9",
];

export type SeriesPoint = { periodStart: string; absolute: number; pctOfDenominator?: number | null };

export function SectionLineChart({
  title,
  series,
  maxLines = 24,
}: {
  title: string;
  series: Array<{ field: string; points: SeriesPoint[] }>;
  /** Cap plotted lines for readability; all series still listed in the toggle list */
  maxLines?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const activeSeries = showAll ? series : series.slice(0, maxLines);

  const merged = useMemo(() => {
    const periodMap = new Map<string, Record<string, string | number>>();
    for (const s of activeSeries) {
      for (const p of s.points) {
        const key = p.periodStart;
        const row = periodMap.get(key) ?? { period: key };
        row[s.field] = p.absolute;
        periodMap.set(key, row);
      }
    }
    return [...periodMap.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [activeSeries]);

  const lineKeys = activeSeries.map((s) => s.field);

  if (activeSeries.length === 0 || merged.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</p>
        <p className="mt-4 text-sm text-zinc-500">No time-series points for the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</p>
        {series.length > maxLines ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-cyan-400/90 hover:text-cyan-300"
          >
            {showAll ? `Show first ${maxLines} series` : `Show all ${series.length} series`}
          </button>
        ) : null}
      </div>
      <div className="h-56 w-full min-w-0 sm:h-72">
        <div className="h-full w-full overflow-x-auto">
          <div className="h-full min-w-[min(100%,520px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="period"
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickFormatter={(v) => String(v).slice(0, 7)}
            />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                background: "#0c0d12",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 11,
                maxHeight: 280,
                overflowY: "auto",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => String(value).replace(/_/g, " ")}
            />
            {lineKeys.map((field, i) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={1.5}
                dot={false}
                name={field}
                isAnimationActive={false}
              />
            ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
