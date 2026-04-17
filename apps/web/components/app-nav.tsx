"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiximiusMark, cn } from "@aida/ui";
import { AppNavRailProvider } from "@/components/app-nav-context";
import { DecisionSupportDock } from "@/components/decision-support-dock";

type NavItem = { href: string; label: string };

type MobileCategoryKey = "command" | "clinical" | "analysis";

const MOBILE_NAV_BAR_OFFSET = "calc(4.5rem + env(safe-area-inset-bottom, 0px))";

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

const mobileCategoryGroups: ReadonlyArray<{ key: MobileCategoryKey; groupIndex: 0 | 1 | 2 }> = [
  { key: "command", groupIndex: 0 },
  { key: "clinical", groupIndex: 1 },
  { key: "analysis", groupIndex: 2 },
];

function hrefWithQuery(href: string, search: string) {
  if (!search) return href;
  return `${href}?${search}`;
}

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/explorer") return pathname.startsWith("/explorer");
  if (href === "/ai") return pathname === "/ai" || pathname.startsWith("/ai/");
  return pathname === href;
}

function isCategoryActive(pathname: string | null, items: NavItem[]): boolean {
  return items.some((item) => isNavActive(pathname, item.href));
}

export function AppNavLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [mobileCategorySheet, setMobileCategorySheet] = useState<MobileCategoryKey | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setMobileCategorySheet(null);
  }, [pathname, qs]);

  useEffect(() => {
    if (!drawerOpen && !mobileCategorySheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, mobileCategorySheet]);

  const currentLabel =
    groups.flatMap((g) => g.items).find((l) => isNavActive(pathname, l.href))?.label ?? "AIDA";

  const sheetGroup =
    mobileCategorySheet === "command"
      ? groups[0]
      : mobileCategorySheet === "clinical"
        ? groups[1]
        : mobileCategorySheet === "analysis"
          ? groups[2]
          : null;

  const aiNavItem = groups[3].items.find((i) => i.href === "/ai");
  const aiActive = aiNavItem ? isNavActive(pathname, aiNavItem.href) : false;

  return (
    <AppNavRailProvider railOpen={railOpen}>
      {/* flex row: rail + main (in-flow rail so page content is never covered on desktop) */}
      <div className="relative flex min-h-screen flex-col md:flex-row">
        {/* Desktop: orbital rail */}
        <aside
          className={cn(
            "hidden flex-col border-r border-white/[0.07] bg-[#05060a]/95 backdrop-blur-2xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] md:sticky md:top-0 md:z-10 md:flex md:h-[100dvh] md:shrink-0 md:self-start",
            railOpen ? "md:w-[272px]" : "md:w-0 md:overflow-hidden md:border-0 md:opacity-0",
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

        <div className="flex min-w-0 flex-1 flex-col">
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
                onClick={() => {
                  setMobileCategorySheet(null);
                  setDrawerOpen(true);
                }}
              >
                Menu
              </button>
            </div>
          </header>

          {children}
        </div>
      </div>

      {/* Mobile bottom dock: categories + AI (System settings/help stay in header Menu) */}
      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#07080c]/95 backdrop-blur-xl md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          {mobileCategoryGroups.map(({ key, groupIndex }) => {
            const group = groups[groupIndex];
            const active = isCategoryActive(pathname, group.items);
            const open = mobileCategorySheet === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMobileCategorySheet((prev) => (prev === key ? null : key))}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center rounded-lg px-0.5 text-center text-[9px] font-medium leading-tight text-zinc-500 transition-colors sm:min-h-[48px] sm:text-[10px]",
                  active || open ? "text-white" : "hover:text-zinc-300",
                )}
                aria-expanded={open}
              >
                {active || open ? (
                  <motion.span
                    layoutId={`mobile-dock-pill-${key}`}
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10 max-w-[5.5rem] px-0.5">{group.title}</span>
              </button>
            );
          })}
          {aiNavItem ? (
            <Link
              href={hrefWithQuery(aiNavItem.href, qs)}
              onClick={() => setMobileCategorySheet(null)}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center justify-center rounded-lg px-0.5 text-center text-[9px] font-medium leading-tight transition-colors sm:min-h-[48px] sm:text-[10px]",
                aiActive ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {aiActive ? (
                <motion.span
                  layoutId="mobile-dock-pill-ai"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10 max-w-[5.5rem] px-0.5">{aiNavItem.label}</span>
            </Link>
          ) : null}
        </div>
      </nav>

      {/* Mobile category sheet (above bottom dock) */}
      <AnimatePresence>
        {sheetGroup && !drawerOpen ? (
          <motion.div
            key="mobile-category-sheet"
            className="fixed inset-x-0 top-0 z-[75] md:hidden"
            style={{ bottom: MOBILE_NAV_BAR_OFFSET }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/65"
              aria-label="Close menu"
              onClick={() => setMobileCategorySheet(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="absolute bottom-0 left-0 right-0 z-[1] flex max-h-[min(72vh,calc(100dvh-7rem))] flex-col rounded-t-2xl border border-white/10 border-b-0 bg-[#0a0b10] shadow-2xl"
            >
              <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">{sheetGroup.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{sheetGroup.blurb}</p>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1">
                {sheetGroup.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={hrefWithQuery(item.href, qs)}
                        onClick={() => setMobileCategorySheet(null)}
                        className={cn(
                          "flex min-h-[48px] items-center rounded-lg px-3 text-sm transition-colors",
                          active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
      <DecisionSupportDock />
    </AppNavRailProvider>
  );
}
