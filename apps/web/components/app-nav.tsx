"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@aida/ui";

const links = [
  { href: "/", label: "Overview" },
  { href: "/preconception", label: "Preconception" },
  { href: "/pregnancy", label: "Pregnancy" },
  { href: "/postnatal", label: "Postnatal" },
  { href: "/infants", label: "Infants" },
  { href: "/outcomes", label: "Outcomes" },
  { href: "/high-risk", label: "High-risk" },
  { href: "/correlations", label: "Correlations" },
  { href: "/explorer", label: "Explorer" },
  { href: "/ai", label: "AI Insights" },
  { href: "/settings", label: "Settings" },
];

const mobileTabs: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/preconception", label: "Preconception" },
  { href: "/pregnancy", label: "Pregnancy" },
  { href: "/explorer", label: "Explorer" },
];

function hrefWithQuery(href: string, search: string) {
  if (!search) return href;
  return `${href}?${search}`;
}

function NavLinks({
  pathname,
  qs,
  variant,
  onNavigate,
}: {
  pathname: string | null;
  qs: string;
  variant: "bar" | "drawer";
  onNavigate?: () => void;
}) {
  return (
    <>
      {links.map((l) => {
        const active = pathname === l.href;
        const to = hrefWithQuery(l.href, qs);
        return (
          <Link
            key={l.href}
            href={to}
            onClick={onNavigate}
            className={cn(
              "relative rounded-lg font-medium transition-colors",
              variant === "bar" &&
                "shrink-0 px-2.5 py-2.5 text-xs md:min-h-0 md:py-1.5 min-h-[44px] flex items-center",
              variant === "drawer" &&
                "flex min-h-[48px] items-center border-b border-white/5 px-4 py-3.5 text-sm",
              active ? "text-white" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {active && variant === "bar" ? (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-lg bg-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
            {active && variant === "drawer" ? (
              <span className="absolute inset-y-0 left-0 w-1 rounded-r bg-cyan-400/80" />
            ) : null}
            <span className={cn("relative z-10", variant === "drawer" && "pl-1")}>{l.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/90 backdrop-blur-xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2 md:px-6 md:py-3">
          <span className="mr-2 shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            AIDA
          </span>

          <div className="hidden min-h-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            <NavLinks pathname={pathname} qs={qs} variant="bar" />
          </div>

          <button
            type="button"
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium text-zinc-200 md:hidden"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            More
          </button>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#07080c]/95 backdrop-blur-xl md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-5 gap-1 px-2 py-2">
          {mobileTabs.map((tab) => {
            const active = pathname === tab.href;
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
            key="mobile-nav"
            id="mobile-nav-drawer"
            className="fixed inset-0 z-[100] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-white/10 bg-[#0a0b10] shadow-2xl supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-medium text-zinc-300">Navigate</span>
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] rounded-lg text-sm text-zinc-400 hover:text-white"
                  onClick={() => setDrawerOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <NavLinks
                  pathname={pathname}
                  qs={qs}
                  variant="drawer"
                  onNavigate={() => setDrawerOpen(false)}
                />
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
