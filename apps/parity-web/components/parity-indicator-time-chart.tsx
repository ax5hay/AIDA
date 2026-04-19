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
];

export type ParityIndPoint = { period: string; sum: number; submissions: number };

export function ParityIndicatorTimeChart({
  title,
  subtitle,
  series,
  maxLines = 8,
  tickFormatter,
}: {
  title: string;
  subtitle?: string;
  series: Array<{ key: string; label: string; points: ParityIndPoint[] }>;
  maxLines?: number;
  tickFormatter?: (iso: string) => string;
}) {
  const fmt = tickFormatter ?? ((v: string) => v);
  const [showAll, setShowAll] = useState(false);
  const activeSeries = showAll ? series : series.slice(0, maxLines);

  const merged = useMemo(() => {
    const periodMap = new Map<string, Record<string, string | number>>();
    for (const s of activeSeries) {
      for (const p of s.points) {
        const row = periodMap.get(p.period) ?? { period: p.period };
        row[s.key] = p.sum;
        row[`__sub_${s.key}`] = p.submissions;
        periodMap.set(p.period, row);
      }
    }
    return [...periodMap.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [activeSeries]);

  const lineKeys = activeSeries.map((s) => s.key);

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
      {subtitle ? (
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
      ) : null}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</p>
        {series.length > maxLines ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-cyan-400/90 hover:text-cyan-300"
          >
            {showAll ? `Show first ${maxLines} indicators` : `Show all ${series.length} indicators`}
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
                  tickFormatter={(v) => fmt(String(v))}
                />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={44} />
                <Tooltip
                  content={({ active, label, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = merged.find((r) => String(r.period) === String(label));
                    return (
                      <div
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs shadow-xl"
                        style={{ background: "#0c0d12" }}
                      >
                        <p className="font-medium text-zinc-200">{fmt(String(label))}</p>
                        <ul className="mt-1 space-y-0.5">
                          {payload.map((item) => {
                            const k = String(item.dataKey ?? "");
                            const sub = row?.[`__sub_${k}`];
                            return (
                              <li key={k} className="text-zinc-400">
                                <span style={{ color: item.color }}>{item.name}</span>:{" "}
                                <span className="tabular-nums text-zinc-100">{item.value as number}</span>
                                {typeof sub === "number" ? (
                                  <span className="text-zinc-600"> ({sub} returns in bucket)</span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => String(value).slice(0, 42)} />
                {lineKeys.map((field, i) => (
                  <Line
                    key={field}
                    type="monotone"
                    dataKey={field}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={1.5}
                    dot={false}
                    name={activeSeries.find((s) => s.key === field)?.label ?? field}
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
