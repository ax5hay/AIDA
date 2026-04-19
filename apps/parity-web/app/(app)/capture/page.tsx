"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageShell } from "@aida/ui";
import {
  PARITY_INDICATORS,
  PARITY_SECTION_LABEL,
  type ParityIndicatorMeta,
  type ParityIntFields,
} from "@aida/parity-core";
import { useMemo, useState } from "react";
import {
  fetchBlocks,
  fetchDistricts,
  fetchFacilities,
  fetchFacilityTypes,
  fetchRegions,
  postBlock,
  postDistrict,
  postFacility,
  postFacilityType,
  postRegion,
  postSubmission,
} from "@/lib/api";
import { MONTH_NAMES_EN } from "@/lib/parity-months";

const DEFAULT_PARITY_YEAR = 2026;

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

type MetricState = Partial<Record<keyof ParityIntFields, number | null>>;

function emptyMetrics(): MetricState {
  const m: MetricState = {};
  for (const ind of PARITY_INDICATORS) {
    m[ind.key] = null;
  }
  return m;
}

function IntInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="—"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "") {
            onChange(null);
            return;
          }
          if (!/^\d+$/.test(t)) return;
          const n = Number.parseInt(t, 10);
          if (n > 100_000_000) return;
          onChange(n);
        }}
        className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm text-zinc-200 focus:border-cyan-500/50 focus:outline-none"
      />
    </label>
  );
}

export default function CapturePage() {
  const qc = useQueryClient();
  const districtsQ = useQuery({ queryKey: ["parity-districts"], queryFn: fetchDistricts });
  const ftQ = useQuery({ queryKey: ["parity-ft"], queryFn: fetchFacilityTypes });

  const [districtId, setDistrictId] = useState("");
  const blocksQ = useQuery({
    queryKey: ["parity-blocks", districtId],
    queryFn: () => fetchBlocks(districtId || undefined),
    enabled: !!districtId,
  });

  const [blockId, setBlockId] = useState("");
  const regionsQ = useQuery({
    queryKey: ["parity-regions", blockId],
    queryFn: () => fetchRegions(blockId || undefined),
    enabled: !!blockId,
  });

  const [regionId, setRegionId] = useState("");
  const facilitiesQ = useQuery({
    queryKey: ["parity-facilities", regionId],
    queryFn: () => fetchFacilities(regionId || undefined),
    enabled: !!regionId,
  });

  const [facilityId, setFacilityId] = useState("");
  const [periodYear, setPeriodYear] = useState(DEFAULT_PARITY_YEAR);
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodGranularity, setPeriodGranularity] = useState<"monthly" | "daily">("monthly");
  const [calendarDay, setCalendarDay] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [metrics, setMetrics] = useState<MetricState>(() => emptyMetrics());

  const [addDistrict, setAddDistrict] = useState("");
  const [addBlock, setAddBlock] = useState("");
  const [addFtCode, setAddFtCode] = useState("");
  const [addFtLabel, setAddFtLabel] = useState("");
  const [addRegion, setAddRegion] = useState("");
  const [addFacilityName, setAddFacilityName] = useState("");
  const [addFacilityTypeId, setAddFacilityTypeId] = useState("");

  const grouped = useMemo(() => {
    const g = new Map<ParityIndicatorMeta["section"], ParityIndicatorMeta[]>();
    for (const ind of PARITY_INDICATORS) {
      const list = g.get(ind.section) ?? [];
      list.push(ind);
      g.set(ind.section, list);
    }
    return g;
  }, []);

  const maxDay = daysInMonth(periodYear, periodMonth);
  const effectiveDay = periodGranularity === "monthly" ? 0 : Math.min(Math.max(1, calendarDay), maxDay);

  const submitMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        facilityId,
        periodYear,
        periodMonth,
        periodDay: periodGranularity === "monthly" ? 0 : effectiveDay,
        remarks: remarks.trim() || null,
      };
      for (const ind of PARITY_INDICATORS) {
        const v = metrics[ind.key];
        body[ind.key] = v === undefined ? null : v;
      }
      return postSubmission(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parity-analytics"] });
      qc.invalidateQueries({ queryKey: ["parity-submissions"] });
      setMetrics(emptyMetrics());
      setRemarks("");
    },
  });

  const errMsg = submitMut.error instanceof Error ? submitMut.error.message : null;

  return (
    <PageShell
      title="ANC capture"
      eyebrow="Parity"
      subtitle="Choose where the return belongs, then pick either a whole month or one calendar day, and fill the programme indicators — one saved row per facility per month (monthly mode) or per day (daily mode), not both for the same month."
      explainer={{
        what: "The form used to file ANC statistics for one facility for either a full reporting month or a single day.",
        does: "It walks the geography (district → block → region → facility), applies the same indicator set as your paper or Excel tools, validates obvious mistakes, and saves the row. Monthly and daily rows for the same facility and month cannot be mixed — pick one style for that month.",
      }}
    >
      <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Where this return belongs</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] text-zinc-500">District</span>
              <select
                className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setBlockId("");
                  setRegionId("");
                  setFacilityId("");
                }}
              >
                <option value="">Select…</option>
                {(districtsQ.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] text-zinc-500">Block</span>
              <select
                className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm disabled:opacity-40"
                disabled={!districtId}
                value={blockId}
                onChange={(e) => {
                  setBlockId(e.target.value);
                  setRegionId("");
                  setFacilityId("");
                }}
              >
                <option value="">Select…</option>
                {(blocksQ.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] text-zinc-500">Region (under block)</span>
              <select
                className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm disabled:opacity-40"
                disabled={!blockId}
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setFacilityId("");
                }}
              >
                <option value="">Select…</option>
                {(regionsQ.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] text-zinc-500">Facility (CH / CHC / PHC / RH…)</span>
              <select
                className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm disabled:opacity-40"
                disabled={!regionId}
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                <option value="">Select…</option>
                {(facilitiesQ.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityType.code} — {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Reporting period</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            <span className="text-zinc-400">Whole month</span> = one row for the entire calendar month (like Excel
            imports). <span className="text-zinc-400">Single day</span> = counts for that date only; you can file
            multiple days in the same month.
          </p>
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="granularity"
                  checked={periodGranularity === "monthly"}
                  onChange={() => setPeriodGranularity("monthly")}
                  className="border-white/20 bg-black/40"
                />
                <span className="text-zinc-300">Whole month</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="granularity"
                  checked={periodGranularity === "daily"}
                  onChange={() => setPeriodGranularity("daily")}
                  className="border-white/20 bg-black/40"
                />
                <span className="text-zinc-300">Single calendar day</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Year</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={periodYear}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setPeriodYear(v);
                  }}
                  className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Reporting month</span>
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-200"
                >
                  {MONTH_NAMES_EN.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {periodGranularity === "daily" ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Day of month (1–{maxDay})</span>
                <input
                  type="number"
                  min={1}
                  max={maxDay}
                  value={Math.min(calendarDay, maxDay)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setCalendarDay(v);
                  }}
                  className="min-h-[44px] rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500">Remarks (optional)</span>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      </div>

      <details className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
        <summary className="cursor-pointer text-zinc-400">Add districts, blocks, regions, or facilities</summary>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Geography runs <span className="text-zinc-400">district → block → region</span>, then each{" "}
          <span className="text-zinc-400">facility</span> sits in one region and has a type (CH, CHC, PHC, RH, …). Add
          names here when the programme expands; they appear immediately in the dropdowns above.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={addDistrict}
              onChange={(e) => setAddDistrict(e.target.value)}
              placeholder="New district"
              className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
            />
            <button
              type="button"
              className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200"
              onClick={async () => {
                if (!addDistrict.trim()) return;
                await postDistrict(addDistrict);
                setAddDistrict("");
                qc.invalidateQueries({ queryKey: ["parity-districts"] });
              }}
            >
              Add district
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={addBlock}
              onChange={(e) => setAddBlock(e.target.value)}
              placeholder="New block (uses selected district)"
              className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
            />
            <button
              type="button"
              disabled={!districtId}
              className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
              onClick={async () => {
                if (!districtId || !addBlock.trim()) return;
                await postBlock(districtId, addBlock);
                setAddBlock("");
                qc.invalidateQueries({ queryKey: ["parity-blocks"] });
              }}
            >
              Add block
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={addRegion}
              onChange={(e) => setAddRegion(e.target.value)}
              placeholder="New region (uses selected block)"
              className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
            />
            <button
              type="button"
              disabled={!blockId}
              className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
              onClick={async () => {
                if (!blockId || !addRegion.trim()) return;
                await postRegion(blockId, addRegion);
                setAddRegion("");
                qc.invalidateQueries({ queryKey: ["parity-regions"] });
              }}
            >
              Add region
            </button>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <div>
              <p className="text-xs font-medium text-zinc-400">Add facility</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Pick the <span className="text-zinc-400">region</span> in the main form first. Here: choose the{" "}
                <span className="text-zinc-400">programme type</span> (CH / CHC / PHC / RH — not a block), then type the
                facility&apos;s <span className="text-zinc-400">full name</span> as you want it stored (e.g. CHC
                Chintpurni).
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[8rem] flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Type (dropdown)</span>
                <select
                  className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm disabled:opacity-40"
                  disabled={!regionId}
                  value={addFacilityTypeId}
                  onChange={(e) => setAddFacilityTypeId(e.target.value)}
                >
                  <option value="">Choose CH, CHC, …</option>
                  {(ftQ.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Facility name (text)</span>
                <input
                  value={addFacilityName}
                  onChange={(e) => setAddFacilityName(e.target.value)}
                  placeholder="e.g. CHC Chintpurni"
                  className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={!regionId || !addFacilityTypeId || !addFacilityName.trim()}
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
                onClick={async () => {
                  if (!regionId || !addFacilityTypeId || !addFacilityName.trim()) return;
                  await postFacility(regionId, addFacilityTypeId, addFacilityName);
                  setAddFacilityName("");
                  qc.invalidateQueries({ queryKey: ["parity-facilities"] });
                }}
              >
                Add facility
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <div>
              <p className="text-xs font-medium text-zinc-400">Add facility type (rare)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Only if you need a <span className="text-zinc-400">new category</span> in the system.{" "}
                <span className="text-zinc-400">Short code</span> = a few letters used in reports and filters (e.g. RH).{" "}
                <span className="text-zinc-400">Full label</span> = the readable title (e.g. Regional hospital). This is not a
                block or region.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex w-36 flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Short code</span>
                <input
                  value={addFtCode}
                  onChange={(e) => setAddFtCode(e.target.value)}
                  placeholder="RH"
                  className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm"
                />
              </label>
              <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <span className="text-[11px] text-zinc-500">Full label</span>
                <input
                  value={addFtLabel}
                  onChange={(e) => setAddFtLabel(e.target.value)}
                  placeholder="Regional hospital"
                  className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm"
                />
              </label>
              <button
                type="button"
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200"
                onClick={async () => {
                  if (!addFtCode.trim() || !addFtLabel.trim()) return;
                  await postFacilityType(addFtCode, addFtLabel);
                  setAddFtCode("");
                  setAddFtLabel("");
                  qc.invalidateQueries({ queryKey: ["parity-ft"] });
                }}
              >
                Add facility type
              </button>
            </div>
          </div>
        </div>
      </details>

      {[...grouped.entries()].map(([section, inds]) => (
        <section key={section} className="mb-10">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-400/85">
            {PARITY_SECTION_LABEL[section]}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inds.map((ind) => (
              <IntInput
                key={ind.key}
                label={ind.label}
                value={metrics[ind.key]}
                onChange={(v) => setMetrics((prev) => ({ ...prev, [ind.key]: v }))}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#07080c]/95 py-4 backdrop-blur">
        <button
          type="button"
          disabled={
            submitMut.isPending ||
            !facilityId ||
            periodYear < 2000 ||
            periodYear > 2100 ||
            periodMonth < 1 ||
            periodMonth > 12 ||
            (periodGranularity === "daily" && (effectiveDay < 1 || effectiveDay > maxDay))
          }
          onClick={() => submitMut.mutate()}
          className="w-full rounded-xl bg-cyan-500/20 py-3 text-sm font-medium text-cyan-100 ring-1 ring-cyan-500/35 disabled:opacity-40 sm:w-auto sm:px-8"
        >
          {submitMut.isPending ? "Submitting…" : "Validate & submit"}
        </button>
        {errMsg ? <pre className="mt-3 max-h-48 overflow-auto text-xs text-rose-300">{errMsg}</pre> : null}
        {submitMut.data ? (
          <p className="mt-3 text-sm text-emerald-300/90">
            Saved successfully.
            {submitMut.data.warnings?.length
              ? ` ${submitMut.data.warnings.length} soft checks need your attention — review the message above.`
              : " No issues reported."}{" "}
            <Link href="/insights" className="underline">
              Open data analytics
            </Link>
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
