"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AiximiusMark } from "@aida/ui";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

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
  { step: "01", title: "Ingest", desc: "Monthly CHC assessments tied to facilities and reporting windows." },
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
          <span className="hidden text-[11px] uppercase tracking-widest text-zinc-600 sm:block">CHC intelligence</span>
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
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-cyan-400/90">
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
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/overview"
              className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-10 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_-20px_rgba(34,211,238,0.45)] transition hover:brightness-110"
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-20 grid max-w-5xl gap-4 sm:grid-cols-3"
        >
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${p.accent} p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]`}
            >
              <span className="font-mono text-[10px] text-zinc-600">0{i + 1}</span>
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
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {flows.map((f, i) => (
              <div key={f.step} className="relative rounded-2xl border border-white/10 bg-[#0a0b10]/80 p-6 backdrop-blur-sm">
                {i < flows.length - 1 ? (
                  <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-cyan-500/40 to-transparent md:block" />
                ) : null}
                <span className="font-mono text-2xl font-light text-cyan-500/40">{f.step}</span>
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
          className="mx-auto mt-24 max-w-5xl rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-12"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready when your team is</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">
                Same dark canvas, cyan accents, and glass panels as the product — so the landing page feels like the first
                screen of the app, not a separate marketing site.
              </p>
            </div>
            <Link
              href="/overview"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-8 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.1]"
            >
              Enter dashboard →
            </Link>
          </div>
        </motion.section>

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
            <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
              <Link href="/help" className="hover:text-cyan-400/90">
                Help & dictionary
              </Link>
              <Link href="/explorer" className="hover:text-cyan-400/90">
                Explorer
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
