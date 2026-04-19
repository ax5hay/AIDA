"use client";

import { PARITY_INDICATORS, PARITY_SECTION_LABEL, type ParityIndicatorMeta } from "@aida/parity-core";
import { PageShell } from "@aida/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { fetchSubmission } from "@/lib/api";
import { formatSubmissionPeriod } from "@/lib/parity-months";

function fmtCell(v: number | null | undefined) {
  if (v == null) return "—";
  return String(v);
}

function DetailInner() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const ret = searchParams.get("return");

  const q = useQuery({
    queryKey: ["parity-submission", id],
    queryFn: () => fetchSubmission(id),
    enabled: !!id,
  });

  const grouped = useMemo(() => {
    const g = new Map<ParityIndicatorMeta["section"], ParityIndicatorMeta[]>();
    for (const ind of PARITY_INDICATORS) {
      const list = g.get(ind.section) ?? [];
      list.push(ind);
      g.set(ind.section, list);
    }
    return g;
  }, []);

  const backHref = ret ? `/observe?${ret}` : "/observe";

  if (q.isLoading) {
    return (
      <PageShell title="Monthly return" eyebrow="Parity · Observation centre" subtitle="Loading…">
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </PageShell>
    );
  }
  if (q.error) {
    return (
      <PageShell title="Monthly return" eyebrow="Parity · Observation centre" subtitle="Something went wrong">
        <p className="text-sm text-rose-400">{(q.error as Error).message}</p>
        <Link href={backHref} className="mt-4 inline-block text-sm text-cyan-400/90 hover:underline">
          ← Back to list
        </Link>
      </PageShell>
    );
  }

  const s = q.data!;

  return (
    <PageShell
      title="Monthly return — full detail"
      eyebrow="Parity · Observation centre"
      subtitle={`${s.facilityName} · ${formatSubmissionPeriod(s.periodYear, s.periodMonth, s.periodDay ?? 0)}`}
      explainer={{
        what: "A read-only view of one facility’s ANC indicators for a single reporting month.",
        does: "Every field from the monthly form is listed here so you can audit the exact numbers, spot blanks, or confirm a value before following up in the field.",
      }}
    >
      <div className="mb-6">
        <Link href={backHref} className="text-sm text-cyan-400/90 hover:underline">
          ← Back to list
        </Link>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">District</dt>
            <dd className="mt-0.5 text-zinc-200">{s.districtName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Block</dt>
            <dd className="mt-0.5 text-zinc-200">{s.blockName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Region</dt>
            <dd className="mt-0.5 text-zinc-200">{s.regionName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Facility</dt>
            <dd className="mt-0.5 text-zinc-200">
              <span className="font-mono text-cyan-200/80">{s.facilityTypeCode}</span> {s.facilityName}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Reporting month</dt>
            <dd className="mt-0.5 text-zinc-200">
              {formatSubmissionPeriod(s.periodYear, s.periodMonth, s.periodDay ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Recorded in Parity</dt>
            <dd className="mt-0.5 text-xs text-zinc-400">{new Date(s.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
        {s.remarks ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Remarks</p>
            <p className="mt-1 whitespace-pre-wrap text-zinc-300">{s.remarks}</p>
          </div>
        ) : null}
      </div>

      {[...grouped.entries()].map(([section, inds]) => (
        <section key={section} className="mb-10">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-400/85">
            {PARITY_SECTION_LABEL[section]}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            “—” means no number was entered for that indicator this month.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="p-3 font-medium">Indicator</th>
                  <th className="p-3 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {inds.map((ind) => (
                  <tr key={ind.key} className="border-b border-white/5">
                    <td className="p-3 text-zinc-300">{ind.label}</td>
                    <td className="p-3 text-right font-mono text-zinc-200">
                      {fmtCell(s[ind.key] as number | null | undefined)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </PageShell>
  );
}

export default function ObserveDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c] p-10 text-sm text-zinc-500">Loading…</div>}>
      <DetailInner />
    </Suspense>
  );
}
