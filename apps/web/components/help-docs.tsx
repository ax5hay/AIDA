import Link from "next/link";
import { cn } from "@aida/ui";
import {
  HELP_API_ROUTES,
  HELP_ASSESSMENT,
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
  HELP_SECTION_ENDPOINT_KEYS,
  HELP_VALIDATION,
  type HelpField,
} from "@/lib/help-fields";

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "reading-metrics", label: "Percentages & denominators" },
  { id: "filters", label: "Filters & URLs" },
  { id: "model", label: "Core tables" },
  { id: "sections", label: "Clinical sections (all columns)" },
  { id: "remarks-docs", label: "Remarks & documents" },
  { id: "derived", label: "Derived metrics & formulas" },
  { id: "section-api", label: "Section analytics API" },
  { id: "validation", label: "Data validation" },
  { id: "overview-behavior", label: "Overview, cache & alerts" },
  { id: "advanced", label: "Correlations, districts, scatters, anomalies" },
  { id: "routes", label: "API routes" },
  { id: "pages", label: "UI pages → data" },
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
            BP, etc.) is &quot;test count ÷ Σ total_anc_registered&quot; summed across the filtered assessments. The UI shows
            the numerator and denominator when available.
          </li>
          <li>
            <strong className="text-zinc-300">Mortality &amp; adverse birth outcomes</strong> — maternal deaths, early neonatal
            deaths, LBW, and preterm use **live births** as denominator where the engine defines a rate.
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
        <h2 className="mt-14 text-lg font-semibold text-white">Filters & URL query params</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Mirrors <code className="rounded bg-white/5 px-1 font-mono text-[13px]">ExplorerFilters</code> on the API.
          The filter bar updates <code className="font-mono text-[13px]">from</code>, <code className="font-mono text-[13px]">to</code>,{" "}
          <code className="font-mono text-[13px]">district</code>, <code className="font-mono text-[13px]">facilityId</code> — the
          same query string is appended when navigating between Overview, Analytics, section pages, Explorer, and AI (for the
          overview payload).
        </p>
        <FieldTable title="Query parameters" rows={HELP_FILTERS} model="URL" />
      </section>

      <section id="model" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Facility & assessment shell</h2>
        <FieldTable title="Facility" rows={HELP_FACILITY} model="Facility" />
        <FieldTable title="Facility assessment" rows={HELP_ASSESSMENT} model="assessment row" />
      </section>

      <section id="sections" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Clinical sections — every DB column</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Numeric fields are stored as integers ≥ 0. They are summed across all assessments matching filters unless you are
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
        <h2 className="mt-14 text-lg font-semibold text-white">Derived metrics (analytics engine)</h2>
        <p className="mt-3 text-sm text-zinc-400">
          These are not stored columns; they are computed in code from summed or row-wise data.
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

      <section id="section-api" className="scroll-mt-28 space-y-4 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-white">Section analytics (`/analytics/section/:section`)</h2>
        <p>
          Valid <code className="rounded bg-white/5 px-1 font-mono text-[13px]">section</code> keys:{" "}
          <span className="font-mono text-xs text-zinc-500">
            {HELP_SECTION_ENDPOINT_KEYS.join(", ")}
          </span>
        </p>
        <ul className="list-inside list-disc space-y-2 text-zinc-400">
          <li>
            <strong className="text-zinc-300">totals</strong> — sum of each field across filtered assessments (missing sections
            skipped).
          </li>
          <li>
            <strong className="text-zinc-300">fieldMetrics</strong> — absolute totals plus percentage vs an explicit
            denominator: for ANC registration, each screening field uses{" "}
            <code className="font-mono text-[12px]">Σ total_anc_registered</code>; for identification / intervention / high-risk /
            infants / postnatal, the denominator is <strong className="text-zinc-300">Σ all fields in that section</strong> (share
            of workload mix). For <code className="font-mono text-[12px]">delivery_and_outcomes</code>, per-field rules apply
            (e.g. deaths and LBW vs live births; delivery site fields vs Σ facility + other institutional + home). Each card can
            include a short <code className="font-mono text-[12px]">denominatorNote</code>.
          </li>
          <li>
            <strong className="text-zinc-300">comparativeDistribution</strong> — each field’s share of the{" "}
            <em>section internal</em> sum (all fields in that section), useful for burden plots.
          </li>
          <li>
            <strong className="text-zinc-300">timeSeries</strong> — monthly buckets (UTC year-month) of absolute counts; for the
            ANC section only, monthly % uses that month’s bucket totals for numerator and{" "}
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
        <h2 className="text-lg font-semibold text-white">Program overview payload</h2>
        <p>
          The overview endpoint aggregates the same filtered assessments and returns{" "}
          <code className="font-mono text-[12px]">meta</code> (assessment count, facility and district counts, min/max reporting
          period), <code className="font-mono text-[12px]">corpus</code> (section presence counts, ANC numerators, outcome
          denominators for transparent KPI math), <code className="font-mono text-[12px]">kpis</code> (screening rates, gaps,
          mortality, delivery, LBW, preterm), a{" "}
          <code className="font-mono text-[12px]">funnel</code> (preconception identified/managed, interventions object, pregnancy
          registered/identified/managed, outcome death counts), <code className="font-mono text-[12px]">alerts</code> when
          rule thresholds fire, and <code className="font-mono text-[12px]">validation.issues</code>.
        </p>
        <p>
          <strong className="text-zinc-300">Alerts (rule-based)</strong>: maternal mortality rate &gt; 0.002 (deaths per live
          birth); HIV screening rate &lt; 0.85; Hb×4 screening rate &lt; 0.75.
        </p>
        <p>
          <strong className="text-zinc-300">Caching</strong>: overview responses are cached server-side for a short TTL (~30
          seconds) to reduce load; the extended <code className="font-mono text-[12px]">/analytics/intelligence</code>{" "}
          response uses a separate key and a slightly longer TTL (~60s). Filters bust cache keys.
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
            <strong className="text-zinc-300">Anomalies</strong> — z-scores on per-assessment{" "}
            <code className="font-mono text-[12px]">live_births</code> or{" "}
            <code className="font-mono text-[12px]">maternal_deaths</code>; flags when{" "}
            <code className="font-mono text-[12px]">|z| &gt; 2.5</code>. API responses include pagination metadata (page,
            pageSize, total).
          </li>
          <li>
            <strong className="text-zinc-300">Intervention comparison (correlations)</strong> — same Pearson constructs, split at
            the midpoint of the filtered timeline for early vs later reporting periods (exploratory).
          </li>
          <li>
            <strong className="text-zinc-300">Public health intelligence</strong> —{" "}
            <code className="font-mono text-[12px]">GET /analytics/intelligence</code> adds pipeline funnels (four
            standardized chains), gap analytics and district severity, extended correlations (Pearson/Spearman, χ², risk
            ratio), aligned monthly cohorts, time series with moving averages and spike indices, distribution shares,
            multivariate scatters, combined anomaly methods (z-score, IQR, isolation-style), mother–infant cross-links, and
            deterministic <em>what / why / next</em> insight blocks. Cached separately from overview (~60s).
          </li>
        </ul>
      </section>

      <section id="routes" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">Backend analytics routes (summary)</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-400">
          {HELP_API_ROUTES.map((r) => (
            <li key={r.route} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="font-mono text-xs text-cyan-400/80">{r.route}</span>
              <span className="mt-1 block text-xs text-zinc-500">{r.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="pages" className="scroll-mt-28">
        <h2 className="mt-14 text-lg font-semibold text-white">App pages and which data they use</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="p-3 font-medium">Page</th>
                <th className="p-3 font-medium">Path</th>
                <th className="p-3 font-medium">Primary data</th>
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
        Documentation generated to mirror the Prisma schema and Nest <code className="font-mono">AnalyticsService</code>. If the
        schema changes, update <code className="font-mono">packages/db/prisma/schema.prisma</code> and this help reference
        together.
      </p>
    </div>
  );
}
