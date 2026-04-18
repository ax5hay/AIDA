import Link from "next/link";
import { cn } from "@aida/ui";
import {
  HELP_ASSESSMENT,
  HELP_CLINICAL_SECTIONS,
  HELP_DELIVERY_OUTCOMES,
  HELP_DOCUMENTS,
  HELP_DERIVED_METRICS,
  HELP_FACILITY,
  HELP_FILTERS,
  HELP_HIGH_RISK,
  HELP_INFANTS,
  HELP_INTRO,
  HELP_PAGE_MAP,
  HELP_POSTNATAL,
  HELP_PRECONCEPTION_IDENTIFIED,
  HELP_PRECONCEPTION_INTERVENTIONS,
  HELP_PRECONCEPTION_MANAGED,
  HELP_PREGNANT_IDENTIFIED,
  HELP_PREGNANT_MANAGED,
  HELP_PREGNANT_REGISTERED_SCREENED,
  HELP_REMARKS,
  HELP_VALIDATION,
  type HelpField,
} from "@/lib/help-fields";

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "reading-metrics", label: "Percentages & denominators" },
  { id: "filters", label: "Filters & sharing" },
  { id: "model", label: "Core tables" },
  { id: "sections", label: "Clinical sections (all columns)" },
  { id: "remarks-docs", label: "Remarks & documents" },
  { id: "derived", label: "Derived metrics & formulas" },
  { id: "section-pages", label: "What each clinical page shows" },
  { id: "validation", label: "Data validation" },
  { id: "overview-behavior", label: "Program overview & alerts" },
  { id: "advanced", label: "Correlations, districts, scatters, anomalies" },
  { id: "pages", label: "Screens & data" },
] as const;

function FieldTable({ title, rows, model }: { title: string; rows: HelpField[]; model: string }) {
  return (
    <div className="scroll-mt-24">
      <h3 className="mt-10 text-sm font-semibold text-white">
        {title}{" "}
        <span className="font-mono text-xs font-normal text-zinc-500">({model})</span>
      </h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="p-3 font-medium">Column</th>
              <th className="p-3 font-medium">Meaning</th>
              <th className="p-3 font-medium">In the product</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-white/[0.06]">
                <td className="whitespace-nowrap p-3 align-top font-mono text-[12px] text-cyan-400/85">{r.name}</td>
                <td className="p-3 align-top text-zinc-300">{r.meaning}</td>
                <td className="p-3 align-top text-xs leading-relaxed text-zinc-500">{r.usedIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HelpDocs({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-4xl", className)}>
      <nav
        aria-label="On this page"
        className="mb-10 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm lg:sticky lg:top-24"
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">On this page</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {toc.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-cyan-400/90 underline-offset-4 hover:underline">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="intro" className="scroll-mt-28 space-y-4 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-lg font-semibold text-white">{HELP_INTRO.title}</h2>
        {HELP_INTRO.paragraphs.map((p, i) => (
          <p key={i}>
            {p.split(/\*\*(.*?)\*\*/g).map((chunk, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-medium text-zinc-200">
                  {chunk}
                </strong>
              ) : (
                chunk
              ),
            )}
          </p>
        ))}
      </section>

      <section id="reading-metrics" className="scroll-mt-28 space-y-4 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-lg font-semibold text-white">Reading percentages (client-friendly)</h2>
        <p>
          AIDA always ties a percentage to a **count you can audit**. If you only remember one rule: ask &quot;percent of
          what?&quot;
        </p>
        <ul className="list-inside list-disc space-y-3">
          <li>
            <strong className="text-zinc-300">Program overview &amp; Analytics KPI cards</strong> — ANC screening (HIV, Hb×4,
            BP, etc.) divides each test count by the sum of{" "}
            <code className="font-mono text-[12px]">total_anc_registered</code> across filtered assessments. The UI shows the
            numerator and denominator when available.
          </li>
          <li>
            <strong className="text-zinc-300">Mortality &amp; adverse birth outcomes</strong> — maternal deaths, early neonatal
            deaths, LBW, and preterm use **live births** as denominator where the product defines a rate.
          </li>
          <li>
            <strong className="text-zinc-300">Section page — “distribution” bars</strong> — percentages are the field’s share
            of the **sum of all fields in that section** (workload mix), not automatically ANC coverage. Use the field metric
            grid above for ANC-linked %.
          </li>
          <li>
            <strong className="text-zinc-300">Correlations — before/after</strong> — splits the timeline at the midpoint for
            exploratory discussion of programme timing; it does not prove causality.
          </li>
          <li>
            <strong className="text-zinc-300">Comparison lab</strong> — each run states how many assessments were used and
            which chart type was chosen; export CSV for stakeholder tables.
          </li>
        </ul>
      </section>

      <section id="filters" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Filters &amp; shareable views</h2>
        <p className="mt-3 text-sm text-zinc-400">
          The filter bar (date range, district, facility) is the same everywhere. When you move between Overview, Analytics,
          clinical section pages, Explorer, and AI insights, your choices stay attached so colleagues opening the link see the
          same slice of data.
        </p>
        <FieldTable title="Filter fields" rows={HELP_FILTERS} model="filters" />
      </section>

      <section id="model" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Facility &amp; assessment shell</h2>
        <FieldTable title="Facility" rows={HELP_FACILITY} model="Facility" />
        <FieldTable title="Facility assessment" rows={HELP_ASSESSMENT} model="assessment row" />
      </section>

      <section id="sections" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Clinical sections — every stored field</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Numeric fields are stored as integers ≥ 0. They are summed across all assessments matching your filters unless you are
          viewing a single row in Explorer detail.
        </p>
        <FieldTable title="Preconception — women identified" rows={HELP_PRECONCEPTION_IDENTIFIED} model="PreconceptionWomenIdentified" />
        <FieldTable title="Preconception — interventions" rows={HELP_PRECONCEPTION_INTERVENTIONS} model="PreconceptionInterventions" />
        <FieldTable title="Preconception — women managed" rows={HELP_PRECONCEPTION_MANAGED} model="PreconceptionWomenManaged" />
        <FieldTable
          title="Pregnancy — registered & screened (ANC)"
          rows={HELP_PREGNANT_REGISTERED_SCREENED}
          model="PregnantWomenRegisteredAndScreened"
        />
        <FieldTable title="Pregnancy — women identified" rows={HELP_PREGNANT_IDENTIFIED} model="PregnantWomenIdentified" />
        <FieldTable title="Pregnancy — women managed" rows={HELP_PREGNANT_MANAGED} model="PregnantWomenManaged" />
        <FieldTable title="High-risk pregnancy" rows={HELP_HIGH_RISK} model="HighRiskPregnancy" />
        <FieldTable title="Delivery & outcomes" rows={HELP_DELIVERY_OUTCOMES} model="DeliveryAndOutcomes" />
        <FieldTable title="Infants 0–24 months" rows={HELP_INFANTS} model="Infants0To24Months" />
        <FieldTable title="Postnatal women" rows={HELP_POSTNATAL} model="PostnatalWomen" />
      </section>

      <section id="remarks-docs" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Remarks & documents</h2>
        <FieldTable title="Remarks (text)" rows={HELP_REMARKS} model="Remarks" />
        <FieldTable title="Documents" rows={HELP_DOCUMENTS} model="Documents" />
      </section>

      <section id="derived" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Derived metrics (computed in the product)</h2>
        <p className="mt-3 text-sm text-zinc-400">
          These are not stored columns; they are computed from summed or row-wise data using the formulas below.
        </p>
        <div className="mt-4 space-y-4">
          {HELP_DERIVED_METRICS.map((d) => (
            <div key={d.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-sm text-cyan-400/90">{d.name}</p>
              <p className="mt-2 text-sm text-zinc-300">{d.formula}</p>
              <p className="mt-2 text-xs text-zinc-500">{d.usedIn}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="section-pages" className="scroll-mt-28 space-y-4 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-white">What each clinical page shows</h2>
        <p>
          Each chapter below has its own screen (Preconception, Pregnancy, Outcomes, etc.). On that screen you typically see:
          section totals, a grid of field metrics with explicit denominators where applicable, a workload “distribution” view, and
          a monthly trend.
        </p>
        <ul className="list-inside list-disc space-y-2">
          {HELP_CLINICAL_SECTIONS.map((s) => (
            <li key={s.key}>
              <strong className="text-zinc-300">{s.title}</strong>
            </li>
          ))}
        </ul>
        <ul className="list-inside list-disc space-y-2 text-zinc-400">
          <li>
            <strong className="text-zinc-300">Totals</strong> — sum of each field across filtered assessments (missing clinical
            blocks for a row are skipped).
          </li>
          <li>
            <strong className="text-zinc-300">Field metrics</strong> — absolute totals plus percentage against a clear
            denominator: for ANC registration, each screening field uses{" "}
            <code className="font-mono text-[12px]">Σ total_anc_registered</code>; for identification, intervention, high-risk,
            infants, and postnatal sections, the denominator is usually{" "}
            <strong className="text-zinc-300">the sum of all fields in that section</strong> (share of workload mix). For{" "}
            <code className="font-mono text-[12px]">delivery_and_outcomes</code>, per-field rules apply (e.g. deaths and LBW vs
            live births; delivery site fields vs facility + other institutional + home). Each card can include a short denominator
            note.
          </li>
          <li>
            <strong className="text-zinc-300">Distribution bars</strong> — each field’s share of the{" "}
            <em>section internal</em> sum (all fields in that section), useful for burden plots.
          </li>
          <li>
            <strong className="text-zinc-300">Monthly trend</strong> — counts by reporting month; for the ANC section only,
            monthly % uses that month’s bucket for numerator and{" "}
            <code className="font-mono text-[12px]">total_anc_registered</code> in that bucket as denominator.
          </li>
        </ul>
      </section>

      <section id="validation" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Row-level validation</h2>
        <ul className="mt-4 space-y-3 text-sm text-zinc-400">
          {HELP_VALIDATION.map((v) => (
            <li key={v.code} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-xs text-amber-200/90">{v.code}</p>
              <p className="mt-1 text-zinc-300">{v.rule}</p>
              <p className="mt-1 text-xs text-zinc-500">{v.usedIn}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="overview-behavior" className="scroll-mt-28 space-y-4 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-white">Program overview</h2>
        <p>
          The overview screen aggregates the same filtered assessments and shows how many rows and facilities you are looking at,
          which clinical blocks are present, headline screening and outcome rates with transparent numerators and denominators, a
          programme funnel, rule-based alerts when thresholds fire, and a list of validation issues.
        </p>
        <p>
          <strong className="text-zinc-300">Alerts (rule-based)</strong>: maternal mortality rate &gt; 0.002 (deaths per live
          birth); HIV screening rate &lt; 0.85; Hb×4 screening rate &lt; 0.75.
        </p>
        <p>
          <strong className="text-zinc-300">Freshness</strong>: numbers may update shortly after you change filters; very large
          workspaces can take a moment to refresh.
        </p>
      </section>

      <section id="advanced" className="scroll-mt-28 space-y-4 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-white">Correlations, rollups, scatters, anomalies</h2>
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong className="text-zinc-300">Correlations</strong> — Pearson <code className="font-mono text-[12px]">r</code>{" "}
            between assessment-level anemia totals and BMI band totals (preconception and pregnancy). The matrix extends to
            include live births across named series.
          </li>
          <li>
            <strong className="text-zinc-300">District rollup</strong> — groups by district; sums outcomes and ANC numerators to
            compare HIV and Hb×4 intensity vs total ANC registration by district.
          </li>
          <li>
            <strong className="text-zinc-300">Clinical cross-section</strong> — per-assessment pairs for scatter plots: ANC vs
            Hb×4, ANC vs HIV, pregnancy anemia vs live births, preconception anemia identified vs managed.
          </li>
          <li>
            <strong className="text-zinc-300">Anomalies</strong> — statistical flags on per-assessment{" "}
            <code className="font-mono text-[12px]">live_births</code> or{" "}
            <code className="font-mono text-[12px]">maternal_deaths</code> compared to the rest of the filtered cohort (extreme
            values surface for review). Lists are paginated in the explorer-style tables.
          </li>
          <li>
            <strong className="text-zinc-300">Intervention comparison (correlations)</strong> — same Pearson constructs, split at
            the midpoint of the filtered timeline for early vs later reporting periods (exploratory).
          </li>
          <li>
            <strong className="text-zinc-300">Public health intelligence (Analytics suite)</strong> — adds pipeline funnels (four
            standardized chains), gap analytics and district severity, extended correlations (Pearson/Spearman, χ², risk ratio),
            aligned monthly cohorts, time series with moving averages and spike indices, distribution shares, multivariate scatters,
            combined anomaly views, mother–infant cross-links, and deterministic <em>what / why / next</em> insight blocks.
          </li>
        </ul>
      </section>

      <section id="pages" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Screens and what they emphasize</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="p-3 font-medium">Screen</th>
                <th className="p-3 font-medium">Path</th>
                <th className="p-3 font-medium">Primary focus</th>
              </tr>
            </thead>
            <tbody>
              {HELP_PAGE_MAP.map((p) => (
                <tr key={p.path} className="border-b border-white/[0.06]">
                  <td className="p-3 text-zinc-200">{p.page}</td>
                  <td className="p-3">
                    <Link href={p.path} className="font-mono text-xs text-cyan-400/90 hover:underline">
                      {p.path}
                    </Link>
                  </td>
                  <td className="p-3 text-xs text-zinc-500">{p.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-12 border-t border-white/10 pt-8 text-xs text-zinc-600">
        This reference is maintained alongside the assessment data model. If your organisation changes what is collected, update
        data entry training and this dictionary together.
      </p>
    </div>
  );
}
