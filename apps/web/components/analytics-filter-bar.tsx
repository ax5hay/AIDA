"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getDistricts, getFacilities } from "@/lib/api";
import type { AnalyticsFilters } from "@/lib/query-params";
import { cn } from "@aida/ui";

export function AnalyticsFilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: AnalyticsFilters;
  onChange: (patch: Partial<AnalyticsFilters>) => void;
  onClear: () => void;
}) {
  const invalidDateRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  const onFromChange = (nextFrom?: string) => {
    if (nextFrom && filters.to && nextFrom > filters.to) {
      onChange({ from: nextFrom, to: undefined });
      return;
    }
    onChange({ from: nextFrom });
  };

  const onToChange = (nextTo?: string) => {
    if (nextTo && filters.from && nextTo < filters.from) {
      onChange({ from: undefined, to: nextTo });
      return;
    }
    onChange({ to: nextTo });
  };

  const facilitiesQ = useQuery({
    queryKey: ["facilities"],
    queryFn: ({ signal }) => getFacilities(signal),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
  const districtsQ = useQuery({
    queryKey: ["districts"],
    queryFn: ({ signal }) => getDistricts(signal),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const hasActive = !!(filters.from || filters.to || filters.district || filters.facilityId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:flex-row md:flex-wrap md:items-end"
    >
      <p className="w-full text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">What this is:</span> Shared filter bar.{" "}
        <span className="font-medium text-zinc-300">What it does:</span> updates every chart/table on the page using
        the same date, district, and facility window.
      </p>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        From
        <input
          type="date"
          className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-zinc-200 sm:min-h-0 sm:text-sm"
          value={filters.from ?? ""}
          max={filters.to}
          onChange={(e) => onFromChange(e.target.value || undefined)}
        />
      </label>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        To
        <input
          type="date"
          className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-zinc-200 sm:min-h-0 sm:text-sm"
          value={filters.to ?? ""}
          min={filters.from}
          onChange={(e) => onToChange(e.target.value || undefined)}
        />
      </label>
      <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        District
        <select
          className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-zinc-200 sm:min-h-0 sm:text-sm"
          value={filters.district ?? ""}
          onChange={(e) =>
            onChange({
              district: e.target.value || undefined,
              facilityId: undefined,
            })
          }
        >
          <option value="">All districts</option>
          {(districtsQ.data ?? []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[200px] flex-[2] flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Facility
        <select
          className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-zinc-200 sm:min-h-0 sm:text-sm"
          value={filters.facilityId ?? ""}
          onChange={(e) => onChange({ facilityId: e.target.value || undefined })}
        >
          <option value="">All facilities</option>
          {(facilitiesQ.data ?? [])
            .filter((f) => !filters.district || f.district === filters.district)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActive}
          className={cn(
            "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition sm:min-h-0",
            hasActive
              ? "bg-white/10 text-white hover:bg-white/15"
              : "cursor-not-allowed bg-white/5 text-zinc-600",
          )}
        >
          Clear filters
        </button>
      </div>
      {invalidDateRange ? (
        <p className="w-full text-xs text-amber-300">
          Invalid date window detected. Choose a `from` date earlier than `to`.
        </p>
      ) : null}
    </motion.div>
  );
}
