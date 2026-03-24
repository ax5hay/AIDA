"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AiximiusMark } from "./aiximius";
import { cn } from "./cn";

export function PageShell({
  title,
  subtitle,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.06),transparent_50%)]" />
      <div className="relative mx-auto min-w-0 max-w-[1400px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-8 sm:px-6 sm:pt-12 md:pb-24">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-8 sm:mb-12 sm:pb-10 md:flex-row md:items-end md:justify-between"
        >
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-400/90">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </motion.header>
        {children}
        <div className="pointer-events-none mt-12 flex justify-center pb-1 md:mt-16">
          <AiximiusMark />
        </div>
      </div>
    </div>
  );
}

export function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mb-14", className)}
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</h2>
        {hint ? <span className="text-xs text-zinc-600">{hint}</span> : null}
      </div>
      {children}
    </motion.section>
  );
}
