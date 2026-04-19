"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent } from "react";
import { Suspense, useMemo } from "react";
import {
  fetchBlocks,
  fetchDistricts,
  fetchFacilities,
  fetchRegions,
  fetchSubmissionsPage,
} from "@/lib/api";
import { formatSubmissionPeriod } from "@/lib/parity-months";

const PAGE_SIZES = [10, 25, 50] as const;

function ObserveContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const districtId = searchParams.get("districtId") ?? "";
  const blockId = searchParams.get("blockId") ?? "";
  const regionId = searchParams.get("regionId") ?? "";
  const facilityId = searchParams.get("facilityId") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const rawPs = Number(searchParams.get("pageSize") ?? "25");
  const pageSize = PAGE_SIZES.includes(rawPs as (typeof PAGE_SIZES)[number])
    ? (rawPs as (typeof PAGE_SIZES)[number])
    : 25;

  const replace = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    router.replace(`${pathname}?${p.toString()}`);
  };

  const districtsQ = useQuery({ queryKey: ["parity-districts"], queryFn: fetchDistricts });
  const blocksQ = useQuery({
    queryKey: ["parity-blocks", districtId],
    queryFn: () => fetchBlocks(districtId || undefined),
    enabled: !!districtId,
  });
  const regionsQ = useQuery({
    queryKey: ["parity-regions", blockId],
    queryFn: () => fetchRegions(blockId || undefined),
    enabled: !!blockId,
  });
  const facilitiesQ = useQuery({
    queryKey: ["parity-facilities", regionId],
    queryFn: () => fetchFacilities(regionId || undefined),
    enabled: !!regionId,
  });

  const listParams = useMemo(
    () => ({
      districtId: districtId || undefined,
      blockId: blockId || undefined,
      regionId: regionId || undefined,
      facilityId: facilityId || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      pageSize,
    }),
    [districtId, blockId, regionId, facilityId, dateFrom, dateTo, page, pageSize],
  );

  const listQ = useQuery({
    queryKey: ["parity-submissions", listParams],
    queryFn: () => fetchSubmissionsPage(listParams),
    enabled: !invalidDateRange,
  });

  const returnQs = searchParams.toString();

  const openRow = (id: string) => {
    const q = returnQs ? `?return=${encodeURIComponent(returnQs)}` : "";
    router.push(`/observe/${id}${q}`);
  };

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow(id);
    }
  };

  return (
    <PageShell
      title="Observation centre"
      eyebrow="Parity"
      subtitle="Browse saved ANC returns, filter by place and reporting date range, and open a full read-only copy of any row."
      explainer={{
        what: "A searchable table of saved returns (whole-month or single-day rows).",
        does: "Use geography filters and optional From / To dates (same semantics as analytics: daily rows by calendar day; whole-month rows when that month overlaps the range). The URL keeps your filters for sharing.",
      }}
    >
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-300">Tip:</span> choose district first, then block, region, and
          optionally one facility. Use <span className="text-zinc-400">From / To</span> to limit by reporting calendar
          window. Clearing district resets the narrower geography filters.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="District filter"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          value={districtId}
          onChange={(e) => {
            const v = e.target.value;
            replace((p) => {
              if (v) p.set("districtId", v);
              else p.delete("districtId");
              p.delete("blockId");
              p.delete("regionId");
              p.delete("facilityId");
              p.set("page", "1");
            });
          }}
        >
          <option value="">All districts</option>
          {(districtsQ.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Block filter"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-40"
          disabled={!districtId}
          value={blockId}
          onChange={(e) => {
            const v = e.target.value;
            replace((p) => {
              if (v) p.set("blockId", v);
              else p.delete("blockId");
              p.delete("regionId");
              p.delete("facilityId");
              p.set("page", "1");
            });
          }}
        >
          <option value="">All blocks</option>
          {(blocksQ.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Region filter"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-40"
          disabled={!blockId}
          value={regionId}
          onChange={(e) => {
            const v = e.target.value;
            replace((p) => {
              if (v) p.set("regionId", v);
              else p.delete("regionId");
              p.delete("facilityId");
              p.set("page", "1");
            });
          }}
        >
          <option value="">All regions</option>
          {(regionsQ.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Facility filter"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-40"
          disabled={!regionId}
          value={facilityId}
          onChange={(e) => {
            const v = e.target.value;
            replace((p) => {
              if (v) p.set("facilityId", v);
              else p.delete("facilityId");
              p.set("page", "1");
            });
          }}
        >
          <option value="">All facilities</option>
          {(facilitiesQ.data ?? []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.facilityType.code} — {f.name}
            </option>
          ))}
        </select>
        </div>
        <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            From (reporting date)
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                const v = e.target.value;
                replace((p) => {
                  if (v && dateTo && v > dateTo) {
                    p.delete("to");
                  }
                  if (v) p.set("from", v);
                  else p.delete("from");
                  p.set("page", "1");
                });
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            To (reporting date)
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                const v = e.target.value;
                replace((p) => {
                  if (v && dateFrom && v < dateFrom) {
                    p.delete("from");
                  }
                  if (v) p.set("to", v);
                  else p.delete("to");
                  p.set("page", "1");
                });
              }}
            />
          </label>
        </div>
        {invalidDateRange ? (
          <p className="mt-2 text-sm text-rose-400">“From” must be on or before “To”. Adjust the dates to load the list.</p>
        ) : null}
      </div>

      {listQ.error ? (
        <p className="text-sm text-rose-400">{(listQ.error as Error).message}</p>
      ) : listQ.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : listQ.data ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Page <span className="tabular-nums text-white">{listQ.data.meta.page}</span> of{" "}
            <span className="tabular-nums text-white">{listQ.data.meta.totalPages}</span> ·{" "}
            <span className="tabular-nums text-white">{listQ.data.meta.totalCount}</span> returns in this filter ·{" "}
            <span className="text-zinc-500">Click a row for full indicators.</span>
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="p-3">Reporting period</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Block</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Facility</th>
                  <th className="p-3 text-right">ANC attended</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {listQ.data.rows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/[0.04]"
                    onClick={() => openRow(row.id)}
                    onKeyDown={(e) => onRowKey(e, row.id)}
                  >
                    <td className="p-3 text-sm text-zinc-200">
                      {formatSubmissionPeriod(row.periodYear, row.periodMonth, row.periodDay ?? 0)}
                    </td>
                    <td className="p-3 text-zinc-400">{row.districtName}</td>
                    <td className="p-3 text-zinc-400">{row.blockName}</td>
                    <td className="p-3 text-zinc-400">{row.regionName}</td>
                    <td className="p-3 text-zinc-200">
                      <span className="font-mono text-xs text-cyan-200/90">{row.facilityTypeCode}</span> {row.facilityName}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-zinc-200">
                      {row.totalWomenAttendedAnc ?? "—"}
                    </td>
                    <td className="max-w-[200px] truncate p-3 text-xs text-zinc-500">{row.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => {
                  replace((p) => {
                    p.set("pageSize", e.target.value);
                    p.set("page", "1");
                  });
                }}
                className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-zinc-200"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                replace((p) => {
                  p.set("page", String(Math.max(1, listQ.data!.meta.page - 1)));
                })
              }
              disabled={listQ.data.meta.page <= 1}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                replace((p) => {
                  p.set("page", String(listQ.data!.meta.page + 1));
                })
              }
              disabled={!listQ.data.meta.hasMore}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default function ObservePage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-zinc-500">Loading observation centre…</div>}>
      <ObserveContent />
    </Suspense>
  );
}
