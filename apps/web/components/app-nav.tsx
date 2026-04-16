"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiximiusMark, cn } from "@aida/ui";

type NavItem = { href: string; label: string };

const groups: Array<{ title: string; blurb: string; items: NavItem[] }> = [
  {
    title: "Command center",
    blurb: "Filters apply everywhere",
    items: [
      { href: "/overview", label: "Overview" },
      { href: "/analytics", label: "Analytics" },
      { href: "/explorer", label: "Explorer" },
      { href: "/input", label: "Data input" },
    ],
  },
  {
    title: "Clinical chapters",
    blurb: "Section-scoped views",
    items: [
      { href: "/preconception", label: "Preconception" },
      { href: "/pregnancy", label: "Pregnancy" },
      { href: "/postnatal", label: "Postnatal" },
      { href: "/infants", label: "Infants" },
      { href: "/outcomes", label: "Outcomes" },
      { href: "/high-risk", label: "High-risk" },
    ],
  },
  {
    title: "Analysis",
    blurb: "Patterns & proof",
    items: [
      { href: "/correlations", label: "Correlations" },
      { href: "/comparison-lab", label: "Comparison lab" },
    ],
  },
  {
    title: "System",
    blurb: "Narrative & config",
    items: [
      { href: "/ai", label: "AI insights" },
      { href: "/settings", label: "Settings" },
      { href: "/help", label: "Help" },
    ],
  },
];

const mobileTabs: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/overview", label: "Overview" },
  { href: "/analytics", label: "Analytics" },
  { href: "/pregnancy", label: "Care" },
  { href: "/explorer", label: "Data" },
];

function hrefWithQuery(href: string, search: string) {
  if (!search) return href;
  return `${href}?${search}`;
}

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/explorer") return pathname.startsWith("/explorer");
  return pathname === href;
}

export function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, qs]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const currentLabel =
    groups.flatMap((g) => g.items).find((l) => isNavActive(pathname, l.href))?.label ?? "AIDA";

  return (
    <>
      {/* Desktop: orbital rail */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-[60] hidden h-screen w-[272px] flex-col border-r border-white/[0.07] bg-[#05060a]/95 backdrop-blur-2xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] md:flex",
          !railOpen && "md:w-0 md:overflow-hidden md:border-0 md:opacity-0",
        )}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-cyan-500/40 via-violet-500/30 to-fuchsia-500/20" />
        <div className="flex h-full flex-col px-3 pb-6 pt-6">
          <div className="px-2">
            <Link
              href={hrefWithQuery("/overview", qs)}
              className="block font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400/95"
            >
              AIDA
            </Link>
            <p className="mt-2 text-[10px] leading-snug text-zinc-600">
              Health facility intelligence · one filter, every surface
            </p>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pr-1">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">{group.title}</p>
                <p className="px-2 text-[10px] text-zinc-700">{group.blurb}</p>
                <ul className="mt-2 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const to = hrefWithQuery(item.href, qs);
                    return (
                      <li key={item.href}>
                        <Link
                          href={to}
                          className={cn(
                            "relative flex min-h-[40px] items-center rounded-lg px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-white"
                              : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                          )}
                        >
                          {active ? (
                            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                          ) : null}
                          <span className="relative pl-1">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/5 px-2 pt-4">
            <button
              type="button"
              onClick={() => setRailOpen(false)}
              className="w-full rounded-lg border border-white/10 py-2 text-[11px] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
            >
              Collapse rail
            </button>
            <div className="mt-3 flex justify-center opacity-40">
              <AiximiusMark className="scale-90" />
            </div>
          </div>
        </div>
      </aside>

      {/* Collapsed rail tab (desktop) */}
      {!railOpen ? (
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className="fixed left-0 top-1/2 z-[59] hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-white/10 bg-[#0a0b10]/95 px-1.5 py-6 text-[10px] font-medium uppercase tracking-widest text-cyan-400/80 shadow-lg backdrop-blur md:block"
        >
          Menu
        </button>
      ) : null}

      {/* Mobile / sm top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/90 backdrop-blur-xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link href={hrefWithQuery("/overview", qs)} className="font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400/90">
            AIDA
          </Link>
          <span className="min-w-0 flex-1 truncate text-center text-xs text-zinc-500">{currentLabel}</span>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-zinc-200"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            Menu
          </button>
        </div>
      </header>

      {/* Mobile bottom dock */}
      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#07080c]/95 backdrop-blur-xl md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-5 gap-1 px-2 py-2">
          {mobileTabs.map((tab) => {
            const active = isNavActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={hrefWithQuery(tab.href, qs)}
                className={cn(
                  "relative flex min-h-[48px] items-center justify-center rounded-lg px-1 text-[11px] font-medium transition-colors",
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10 truncate">{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "relative flex min-h-[48px] items-center justify-center rounded-lg px-1 text-[11px] font-medium transition-colors",
              drawerOpen ? "text-white" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {drawerOpen ? <span className="absolute inset-0 rounded-lg bg-white/10" /> : null}
            <span className="relative z-10">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[min(100%,22rem)] flex-col border-l border-white/10 bg-[#0a0b10] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-medium text-zinc-300">Navigate</span>
                <button type="button" className="text-sm text-zinc-400" onClick={() => setDrawerOpen(false)}>
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-3">
                {groups.map((group) => (
                  <div key={group.title} className="mb-6">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{group.title}</p>
                    <ul className="mt-2">
                      {group.items.map((item) => {
                        const active = isNavActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={hrefWithQuery(item.href, qs)}
                              onClick={() => setDrawerOpen(false)}
                              className={cn(
                                "flex min-h-[48px] items-center border-b border-white/5 px-3 text-sm",
                                active ? "text-white" : "text-zinc-500",
                              )}
                            >
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <Link
                  href={hrefWithQuery("/", qs)}
                  onClick={() => setDrawerOpen(false)}
                  className="block px-3 py-2 text-sm text-zinc-500"
                >
                  ← Home
                </Link>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Left offset so page content clears the fixed rail on desktop */
export const APP_SIDEBAR_WIDTH_CLASS = "md:pl-[272px]";
