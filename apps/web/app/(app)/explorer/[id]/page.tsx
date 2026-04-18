"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell, Section } from "@aida/ui";
import { getAssessmentDetail } from "@/lib/api";
import { FieldMetricGrid } from "@/components/field-metric-grid";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { withQueryString } from "@/lib/query-params";

function SectionBlock({
  title,
  data,
}: {
  title: string;
  data: Record<string, number | string | null> | null;
}) {
  if (!data) return null;
  const numericEntries = Object.entries(data).filter(
    ([, v]) => typeof v === "number",
  ) as [string, number][];
  const fieldMetrics = numericEntries.map(([field, absolute]) => ({
    field,
    absolute,
    pctOfDenominator: null as number | null,
    denominator: null as number | null,
  }));
  return (
    <Section title={title}>
      <FieldMetricGrid rows={fieldMetrics} />
    </Section>
  );
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const id = typeof params.id === "string" ? params.id : "";

  const q = useQuery({
    queryKey: ["assessment", id],
    queryFn: ({ signal }) => getAssessmentDetail(id, signal),
    enabled: !!id,
  });

  if (!id) {
    return (
      <PageShell title="Assessment" eyebrow="Detail" subtitle="Missing reference">
        <p className="text-sm text-rose-400">This link is incomplete.</p>
      </PageShell>
    );
  }

  if (q.isLoading) {
    return (
      <PageShell title="Assessment" eyebrow="Detail" subtitle="Loading…">
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </PageShell>
    );
  }

  if (q.error || !q.data) {
    return (
      <PageShell title="Assessment" eyebrow="Detail" subtitle="Error">
        <p className="text-sm text-rose-400">{(q.error as Error)?.message ?? "Not found"}</p>
        <Link href={withQueryString("/explorer", qs)} className="mt-4 inline-block text-sm text-cyan-400">
          ← Back to explorer
        </Link>
      </PageShell>
    );
  }

  const d = q.data;

  return (
    <PageShell
      title={d.facility.name}
      eyebrow="Assessment detail"
      subtitle={`${d.periodStart.slice(0, 10)} → ${d.periodEnd.slice(0, 10)} · ${d.facility.district}, ${d.facility.state}`}
      actions={
        <Link
          href={withQueryString("/explorer", qs)}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
        >
          ← Explorer
        </Link>
      }
    >
      {d.validationIssues.length > 0 ? (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-200">Logical validation flags</p>
          <ul className="mt-2 list-inside list-disc text-xs text-amber-200/80">
            {d.validationIssues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-12">
        <SectionBlock title="Preconception — women identified" data={d.preconceptionWomenIdentified} />
        <SectionBlock title="Preconception — interventions" data={d.preconceptionInterventions} />
        <SectionBlock title="Preconception — women managed" data={d.preconceptionWomenManaged} />
        <SectionBlock
          title="Pregnancy — registered & screened"
          data={d.pregnantWomenRegisteredAndScreened}
        />
        <SectionBlock title="Pregnancy — identified" data={d.pregnantWomenIdentified} />
        <SectionBlock title="Pregnancy — managed" data={d.pregnantWomenManaged} />
        <SectionBlock title="High-risk pregnancy" data={d.highRiskPregnancy} />
        <SectionBlock title="Delivery & outcomes" data={d.deliveryAndOutcomes} />
        <SectionBlock title="Infants 0–24 months" data={d.infants0To24Months} />
        <SectionBlock title="Postnatal women" data={d.postnatalWomen} />
      </div>

      {d.remarks ? (
        <Section title="Remarks" className="mt-12">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                observational_remarks
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {d.remarks.observational_remarks || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                respondent_remarks
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {d.remarks.respondent_remarks || "—"}
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {d.documents ? (
        <Section title="Documents (stored keys / URLs)" className="mt-12">
          <ul className="space-y-2 font-mono text-xs text-zinc-400">
            {Object.entries(d.documents).map(([k, v]) => (
              <li key={k}>
                {k}: {v || "—"}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </PageShell>
  );
}
