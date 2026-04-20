"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AiximiusMark } from "@aida/ui";
import { useAidaWebBase } from "@/components/parity-app-nav";

const ease = [0.22, 1, 0.36, 1] as const;

function Orb({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/90 shadow-[0_0_10px_rgba(34,211,238,0.6)] ${className ?? ""}`}
      aria-hidden
    />
  );
}

/** Strip stray query strings on `/` (e.g. old shared links) so the hub stays a clean entry URL. */
function HubUrlCleanup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.size === 0) return;
    router.replace("/", { scroll: false });
  }, [router, searchParams]);
  return null;
}

export default function ProductHubPage() {
  const aidaBase = useAidaWebBase();
  const aidaOverview = `${aidaBase}/overview`;

  return (
    <div className="relative min-h-[min(100dvh,920px)] overflow-x-hidden">
      <Suspense fallback={null}>
        <HubUrlCleanup />
      </Suspense>
      {/* Ambient layers — same vocabulary as PageShell / rail */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-15%,rgba(56,189,248,0.11),transparent_55%),radial-gradient(ellipse_55%_45%_at_100%_20%,rgba(139,92,246,0.08),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(34,211,238,0.05),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)`,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 10%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[28%] h-[420px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-[100px]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto max-w-[1100px] px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-400/85">
            Product hub
          </p>
          <h1 className="mt-4 max-w-[22ch] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.12] tracking-tight text-white">
            One programme.{" "}
            <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-200/90 bg-clip-text text-transparent">
              Two surfaces.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
            <span className="font-medium text-zinc-300">Parity</span> is your disciplined ANC workspace — capture,
            analytics, and observation. <span className="font-medium text-zinc-300">AIDA</span> is the full
            health-facility intelligence suite. Pick the depth you need; both share the same design language.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6 lg:items-stretch">
          {/* Parity — primary surface */}
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.08 }}
            whileHover={{ y: -3 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.07] via-[#0a0b12]/80 to-[#07080c] p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_24px_64px_-32px_rgba(34,211,238,0.15)] transition-[transform] sm:p-7"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
                  Parity workspace
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">ANC capture & quality</h2>
              </div>
              <span className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-200/90">
                In app
              </span>
            </div>
            <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">
              File returns by facility, roll up by district and block, run analytics, and audit every cell in the
              observation centre.
            </p>
            <ul className="relative mt-5 space-y-2.5 text-sm text-zinc-500">
              <li className="flex gap-2.5">
                <Orb className="mt-1.5" />
                <span>Whole-month or daily reporting, with shared date filters across analytics and lists.</span>
              </li>
              <li className="flex gap-2.5">
                <Orb className="mt-1.5" />
                <span>Data-quality signals and denominators inline — built for programme officers, not spreadsheets.</span>
              </li>
            </ul>
            <div className="relative mt-7 flex flex-wrap gap-2.5">
              <Link
                href="/insights"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-500/25 px-5 py-2.5 text-sm font-medium text-cyan-50 ring-1 ring-cyan-400/35 transition hover:bg-cyan-500/35 hover:ring-cyan-400/50"
              >
                Data analytics
              </Link>
              <Link
                href="/observe"
                className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Observation centre
              </Link>
              <Link
                href="/capture"
                className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                ANC capture
              </Link>
            </div>
          </motion.article>

          {/* AIDA — external suite */}
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.14 }}
            whileHover={{ y: -3 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-dashed border-violet-400/25 bg-gradient-to-b from-violet-500/[0.06] via-[#0a0b12]/70 to-[#07080c] p-6 shadow-[0_0_0_1px_rgba(139,92,246,0.08)_inset,0_24px_64px_-32px_rgba(139,92,246,0.12)] transition-[transform] sm:p-7"
          >
            <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-sm font-bold text-violet-100">
                  A
                </span>
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
                    AIDA suite
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Full programme intelligence</h2>
                </div>
              </div>
              <span className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-violet-200/80">
                New tab
              </span>
            </div>
            <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">
              Overview, analytics, explorer, correlations, comparison lab, clinical chapters, and optional AI — the
              complete deployment alongside Parity.
            </p>
            <ul className="relative mt-5 space-y-2.5 text-sm text-zinc-500">
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/80 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                <span>Same visual language: dark shell, cyan accents, orbital navigation.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/80 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                <span>
                  Set <span className="font-mono text-zinc-400">AIDA_WEB_URL</span> in repo{" "}
                  <span className="font-mono text-zinc-400">.env</span> for demos (avoids Next build-time inlining of{" "}
                  <span className="font-mono text-zinc-400">NEXT_PUBLIC_*</span>).
                </span>
              </li>
            </ul>
            <div className="relative mt-7">
              <a
                href={aidaOverview}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:border-violet-400/45 hover:bg-violet-500/25"
              >
                Launch AIDA
                <span className="text-xs opacity-80">↗</span>
              </a>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                Opens the main AIDA web app (overview) in a new browser tab.
              </p>
            </div>
          </motion.article>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease, delay: 0.22 }}
          className="mt-14 flex flex-col items-center gap-4 border-t border-white/5 pt-10 text-center"
        >
          <p className="max-w-md text-[11px] leading-relaxed text-zinc-600">
            Parity and AIDA are designed to feel like one product family — switch from the sidebar any time. Product hub
            always returns here with a clean URL.
          </p>
          <div className="opacity-35">
            <AiximiusMark className="scale-90" />
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
