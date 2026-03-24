"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AiximiusMark } from "@aida/ui";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080c] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_35%,rgba(0,0,0,0.55))]" />

      <header className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400/90">
          AIDA
        </span>
        <Link
          href="/overview"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
        >
          Launch app
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-400/90">
            CHC decision intelligence
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Turn maternal & child health assessments into{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              clear, defensible actions
            </span>
            .
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400 sm:text-xl">
            AIDA connects CHC reporting data to analytics, anomaly detection, and optional narrative
            insights — with filters that persist across every view.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/overview"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500/90 to-indigo-500/90 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] transition hover:brightness-110"
            >
              Open dashboard
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.07]"
            >
              Analytics suite
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            {
              title: "Program overview",
              body: "Screening coverage, mortality signals, institutional delivery mix, and validation flags in one place.",
              href: "/overview",
            },
            {
              title: "Deep analytics",
              body: "District rollups, correlation heatmaps, scatter views, and cohort funnels — no AI required.",
              href: "/analytics",
            },
            {
              title: "Data explorer",
              body: "Drill into assessment rows with facility context and document slots for auditability.",
              href: "/explorer",
            },
          ].map((card, i) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition hover:border-cyan-500/25 hover:bg-white/[0.05]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">{card.title}</h2>
                <span className="text-cyan-400/80 opacity-0 transition group-hover:opacity-100">→</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-500">{card.body}</p>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">0{i + 1}</p>
            </Link>
          ))}
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-24 border-t border-white/10 pt-10 text-xs text-zinc-600"
        >
          <p>
            AIDA — CHC Decision Intelligence Platform. Built for public health teams who need traceable
            metrics and a single semantic layer across the stack.
          </p>
          <p className="mt-4 flex justify-start">
            <AiximiusMark />
          </p>
        </motion.footer>
      </main>
    </div>
  );
}
