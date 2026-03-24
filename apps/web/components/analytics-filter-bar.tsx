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
  const facilitiesQ = useQuery({ queryKey: ["facilities"], queryFn: ({ signal }) => getFacilities(signal) });
  const districtsQ = useQuery({ queryKey: ["districts"], queryFn: ({ signal }) => getDistricts(signal) });

  const hasActive = !!(filters.from || filters.to || filters.district || filters.facilityId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:flex-row md:flex-wrap md:items-end"
    >
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        From
        <input
          type="date"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          value={filters.from ?? ""}
          onChange={(e) => onChange({ from: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        To
        <input
          type="date"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          value={filters.to ?? ""}
          onChange={(e) => onChange({ to: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        District
        <select
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
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
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
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
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            hasActive
              ? "bg-white/10 text-white hover:bg-white/15"
              : "cursor-not-allowed bg-white/5 text-zinc-600",
          )}
        >
          Clear filters
        </button>
      </div>
    </motion.div>
  );
}
