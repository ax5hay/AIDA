"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AiximiusMark, cn } from "@aida/ui";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const quickLinks = [
  { href: "/overview", label: "Overview" },
  { href: "/analytics", label: "Analytics" },
  { href: "/explorer", label: "Explorer" },
  { href: "/correlations", label: "Correlations" },
  { href: "/ai", label: "AI insights" },
  { href: "/help", label: "Help" },
] as const;

const heroBadges = ["Explicit denominators", "Facility traceability", "District rollups"] as const;

const pillarRings = ["ring-cyan-500/20", "ring-violet-500/20", "ring-fuchsia-500/20"] as const;
const pillarHoverRings = ["hover:ring-cyan-500/30", "hover:ring-violet-500/30", "hover:ring-fuchsia-500/25"] as const;

const pillars = [
  {
    title: "One filter, every view",
    copy: "Date, district, and facility flow through Overview, analytics, clinical chapters, and Explorer — no silent context switch.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Denominators you can defend",
    copy: "Rates name their pool: Σ ANC registration, live births, or section workload — surfaced on cards, not buried in a footnote.",
    accent: "from-violet-500/20 to-transparent",
  },
  {
    title: "From signal to record",
    copy: "District rollups, correlations, comparison lab, and anomaly flags link straight to assessment rows for audit.",
    accent: "from-fuchsia-500/15 to-transparent",
  },
] as const;

const flows = [
  { step: "01", title: "Ingest", desc: "Monthly facility assessments tied to health facilities and reporting windows." },
  { step: "02", title: "Aggregate", desc: "Deterministic engine: screening rates, funnels, outcomes, validation." },
  { step: "03", title: "Decide", desc: "Overview, analytics suite, and optional AI on the same snapshots." },
] as const;

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07080c] text-zinc-100">
      {/* Ambient layers — matches in-app PageShell language */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(56,189,248,0.15),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(99,102,241,0.08),transparent_45%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(217,70,239,0.06),transparent_40%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,transparent_30%,rgba(7,8,12,0.9)_100%)]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-400/95">AIDA</span>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="hidden text-[11px] uppercase tracking-widest text-zinc-600 sm:block">Health facility intelligence</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/help"
            className="hidden rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:text-zinc-300 sm:block"
          >
            Reference
          </Link>
          <Link
            href="/overview"
            className="rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 px-5 py-2.5 text-sm font-medium text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)_inset] transition hover:from-cyan-500/25 hover:to-indigo-500/15"
          >
            Launch app
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
        <motion.section {...fadeUp} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-4xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-cyan-400/90 shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]">
            Maternal & child health
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem] lg:leading-[1.08]">
            Decision intelligence built for{" "}
            <span className="bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
              community health programmes
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400 sm:text-xl">
            Turn facility assessments into coverage signals, outcome ratios with explicit denominators, and stakeholder-ready
            views — without losing traceability to the underlying rows.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {heroBadges.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-500"
              >
                {b}
              </span>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/overview"
              className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-10 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_-20px_rgba(34,211,238,0.45)] ring-1 ring-white/10 transition hover:brightness-110 hover:ring-cyan-400/30"
            >
              Open programme overview
            </Link>
            <Link
              href="/analytics"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-10 py-3.5 text-sm font-semibold text-zinc-100 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Explore analytics
            </Link>
          </div>
        </motion.section>

        <motion.nav
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Quick links to app sections"
          className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-2"
        >
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-full border border-white/[0.07] bg-[#0a0b10]/60 px-3.5 py-1.5 text-[12px] font-medium text-zinc-400 backdrop-blur-sm transition hover:border-cyan-500/25 hover:text-cyan-200/90"
            >
              {q.label}
            </Link>
          ))}
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3"
        >
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] ring-1 ring-transparent transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_24px_48px_-28px_rgba(34,211,238,0.15)]",
                p.accent,
                pillarHoverRings[i],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[10px] text-zinc-600">0{i + 1}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full opacity-60 ring-2 ring-offset-2 ring-offset-[#07080c] transition group-hover:opacity-100",
                    pillarRings[i],
                  )}
                />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-white">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.copy}</p>
            </div>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-24 max-w-5xl"
        >
          <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">How data becomes action</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-600">
            A single pipeline from raw assessments to programme decisions — no hand‑wavy exports in between.
          </p>
          <div className="relative mt-10 grid gap-6 md:grid-cols-3">
            <div
              className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-[3.25rem] hidden h-px md:block"
              aria-hidden
            >
              <div className="h-px w-full bg-gradient-to-r from-cyan-500/20 via-indigo-500/30 to-fuchsia-500/20" />
            </div>
            {flows.map((f, i) => (
              <div
                key={f.step}
                className="relative rounded-2xl border border-white/10 bg-[#0a0b10]/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-sm transition hover:border-white/15"
              >
                {i < flows.length - 1 ? (
                  <span
                    className="absolute -right-3 top-[2.85rem] z-[1] hidden text-lg font-light text-cyan-400/50 md:block"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
                <span className="font-mono text-2xl font-light tabular-nums text-cyan-500/50">{f.step}</span>
                <h3 className="mt-2 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="group relative mx-auto mt-24 max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent p-px shadow-[0_32px_80px_-40px_rgba(34,211,238,0.25)]"
        >
          <div className="rounded-[calc(1.5rem-1px)] bg-[#07080c]/90 p-8 backdrop-blur-sm sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl transition group-hover:bg-cyan-500/15" />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready when your team is</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">
                  Same dark canvas, cyan accents, and glass panels as the product — so the landing page feels like the first
                  screen of the app, not a separate marketing site.
                </p>
              </div>
              <Link
                href="/overview"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/15 to-indigo-600/10 px-8 py-3.5 text-sm font-medium text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.12)_inset] transition hover:border-cyan-400/40 hover:from-cyan-500/25 hover:to-indigo-600/20"
              >
                Enter dashboard →
              </Link>
            </div>
          </div>
        </motion.section>

        <div className="mx-auto mt-16 flex min-h-[min(24vh,280px)] w-full max-w-5xl flex-col justify-end overflow-hidden px-4 sm:px-0">
          <p
            className="pointer-events-none w-full select-none text-center font-semibold uppercase text-white/[0.035] antialiased"
            style={{
              fontSize: "clamp(2rem, 11vw, 6.5rem)",
              letterSpacing: "0.42em",
            }}
            aria-hidden
          >
            AIXIMIUS
          </p>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-20 max-w-5xl border-t border-white/10 pt-12"
        >
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">Aiximius</p>
              <p className="mt-2 max-w-md text-sm text-zinc-500">
                AIDA — traceable metrics for public health teams. Built for programmes that answer to data, districts, and
                communities.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
              <Link href="/help" className="transition hover:text-cyan-400/90">
                Help
              </Link>
              <Link href="/explorer" className="transition hover:text-cyan-400/90">
                Explorer
              </Link>
              <Link href="/input" className="transition hover:text-cyan-400/90">
                Data input
              </Link>
              <Link href="/settings" className="transition hover:text-cyan-400/90">
                Settings
              </Link>
            </div>
          </div>
          <div className="mt-10 flex justify-start opacity-50">
            <AiximiusMark />
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
