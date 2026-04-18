"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageShell } from "@aida/ui";
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { getFacilities, getIngestionSchema, postIngestionAssessment } from "@/lib/api";

type FormSectionState = Record<string, number | string | null>;

function prettyLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function InputDataPage() {
  const { filters, setFilters, clearFilters } = useAnalyticsFilters();
  const [facilityId, setFacilityId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [sections, setSections] = useState<Record<string, FormSectionState>>({});

  const schemaQ = useQuery({
    queryKey: ["ingestion-schema"],
    queryFn: ({ signal }) => getIngestionSchema(signal),
    staleTime: 10 * 60_000,
  });
  const facilitiesQ = useQuery({
    queryKey: ["facilities"],
    queryFn: ({ signal }) => getFacilities(signal),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!schemaQ.data) return;
    const nextState: Record<string, FormSectionState> = {};
    for (const section of schemaQ.data.sections) {
      nextState[section.key] = Object.fromEntries(
        section.fields.map((field) => [field.key, field.defaultValue]),
      ) as FormSectionState;
    }
    setSections(nextState);
  }, [schemaQ.data]);

  const createMut = useMutation({
    mutationFn: () =>
      postIngestionAssessment({
        facilityId,
        periodStart,
        periodEnd,
        ...sections,
      }),
  });

  const onFieldChange = (sectionKey: string, fieldKey: string, raw: string, type: "number" | "text") => {
    setSections((prev) => {
      const current = { ...(prev[sectionKey] ?? {}) };
      if (type === "number") {
        current[fieldKey] = raw === "" ? 0 : Number(raw);
      } else {
        current[fieldKey] = raw;
      }
      return { ...prev, [sectionKey]: current };
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await createMut.mutateAsync();
  };

  return (
    <PageShell
      title="Data input"
      eyebrow="Facility assessments"
      subtitle="Create assessment rows directly from the app. The form follows the same clinical sections and fields as the rest of AIDA."
    >
      <AnalyticsFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-medium text-white">Assessment header</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs text-zinc-500">
              Facility
              <select
                required
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                <option value="">Select facility</option>
                {(facilitiesQ.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.district})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Period start
              <input
                required
                type="date"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-500">
              Period end
              <input
                required
                type="date"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </label>
          </div>
        </section>

        {schemaQ.isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-white/5" />
        ) : schemaQ.error ? (
          <p className="text-sm text-rose-400">{(schemaQ.error as Error).message}</p>
        ) : (
          schemaQ.data?.sections.map((section) => (
            <details key={section.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-5" open>
              <summary className="cursor-pointer text-sm font-medium text-white">{section.label}</summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.fields.map((field) => (
                  <label key={field.key} className="text-xs text-zinc-500">
                    {prettyLabel(field.key)}
                    {field.type === "number" ? (
                      <input
                        min={0}
                        step={1}
                        type="number"
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                        value={Number(sections[section.key]?.[field.key] ?? field.defaultValue)}
                        onChange={(e) =>
                          onFieldChange(section.key, field.key, e.target.value, field.type)
                        }
                      />
                    ) : (
                      <textarea
                        className="mt-1 min-h-[88px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                        value={String(sections[section.key]?.[field.key] ?? field.defaultValue ?? "")}
                        onChange={(e) =>
                          onFieldChange(section.key, field.key, e.target.value, field.type)
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </details>
          ))
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMut.isPending || !facilityId || !periodStart || !periodEnd}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 disabled:opacity-40"
          >
            {createMut.isPending ? "Submitting..." : "Submit assessment"}
          </button>
          {createMut.isSuccess ? (
            <p className="text-sm text-emerald-300">Assessment created: {createMut.data.id}</p>
          ) : null}
          {createMut.isError ? (
            <p className="text-sm text-rose-400">{(createMut.error as Error).message}</p>
          ) : null}
        </div>
      </form>
    </PageShell>
  );
}
