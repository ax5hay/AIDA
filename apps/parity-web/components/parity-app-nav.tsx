"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AiximiusMark, cn } from "@aida/ui";

const aidaBase = () => (process.env.NEXT_PUBLIC_AIDA_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");

type NavItem = { href: string; label: string; external?: boolean };

type NavKind = "hub" | "workspace" | "external";

const ParityNavRailContext = createContext(true);

export function ParityNavRailProvider({ railOpen, children }: { railOpen: boolean; children: ReactNode }) {
  return <ParityNavRailContext.Provider value={railOpen}>{children}</ParityNavRailContext.Provider>;
}

export function useParityNavRailOffsetClass(): string {
  const railOpen = useContext(ParityNavRailContext);
  return railOpen ? "md:pl-[272px]" : "md:pl-0";
}

const productHubItem: NavItem = { href: "/", label: "Product hub" };

const workspaceGroup: { title: string; blurb: string; items: NavItem[] } = {
  title: "Parity workspace",
  blurb: "ANC capture, analytics & review",
  items: [
    { href: "/insights", label: "Data analytics" },
    { href: "/observe", label: "Observation centre" },
    { href: "/capture", label: "ANC capture" },
  ],
};

const aidaLaunchItem: NavItem = {
  href: `${aidaBase()}/overview`,
  label: "Open AIDA",
  external: true,
};

const mobileQuickLinks: NavItem[] = [
  { href: "/", label: "Hub" },
  { href: "/insights", label: "Analytics" },
  { href: "/observe", label: "Observe" },
  { href: "/capture", label: "Capture" },
];

function hrefWithQuery(href: string, search: string) {
  if (!search || href.startsWith("http")) return href;
  return `${href}?${search}`;
}

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/observe") return pathname === "/observe" || pathname.startsWith("/observe/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParityAppNavLayout({ children }: { children: ReactNode }) {
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
    [productHubItem, ...workspaceGroup.items].find((l) => isNavActive(pathname, l.href))?.label ?? "Parity";

  const renderNavLink = (
    item: NavItem,
    kind: NavKind,
    opts: { onNavigate?: () => void; className?: string },
  ) => {
    const active = !item.external && isNavActive(pathname, item.href);
    /** Hub always uses `/` so navigation from tool routes always runs (and clears filter query strings). */
    const to =
      item.external ? item.href : kind === "hub" ? "/" : hrefWithQuery(item.href, qs);

    if (kind === "hub") {
      const hubCls = cn(
        "relative flex min-h-[48px] flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-cyan-500/35 bg-gradient-to-br from-cyan-500/12 to-transparent text-white shadow-[inset_0_1px_0_0_rgba(34,211,238,0.12)]"
          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/25 hover:bg-cyan-500/[0.06] hover:text-zinc-100",
        opts.className,
      );
      return (
        <Link href={to} scroll className={hubCls} onClick={opts.onNavigate}>
          {active ? (
            <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r bg-cyan-400/80 shadow-[0_0_14px_rgba(34,211,238,0.35)]" />
          ) : null}
          <span className="relative pl-1 text-[13px] font-semibold tracking-tight">{item.label}</span>
          <span className="relative pl-1 mt-0.5 block text-[10px] font-normal leading-snug text-zinc-500">
            Entry & workspace chooser
          </span>
        </Link>
      );
    }

    if (kind === "external") {
      const extCls = cn(
        "relative flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm transition-colors",
        "border-violet-400/25 bg-violet-500/[0.06] text-violet-100/95 hover:border-violet-400/40 hover:bg-violet-500/12",
        opts.className,
      );
      return (
        <a href={to} target="_blank" rel="noopener noreferrer" className={extCls} onClick={opts.onNavigate}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/15 text-[10px] font-bold text-violet-200">
            A
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{item.label}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-violet-300/70">Separate app · opens new tab</span>
          </span>
          <span className="shrink-0 text-[11px] font-medium text-violet-400/80">↗</span>
        </a>
      );
    }

    const cls = cn(
      "relative flex min-h-[40px] items-center rounded-lg px-2.5 py-2 text-sm transition-colors",
      active
        ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-white"
        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
      opts.className,
    );
    return (
      <Link href={to} className={cls} onClick={opts.onNavigate}>
        {active ? (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
        ) : null}
        <span className="relative pl-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <ParityNavRailProvider railOpen={railOpen}>
      <div className="relative flex min-h-screen flex-col md:flex-row">
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
                href={hrefWithQuery("/insights", qs)}
                className="block font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400/95"
              >
                Parity
              </Link>
              <p className="mt-2 text-[10px] leading-snug text-zinc-600">
                ANC programme workspace · aligned to AIDA
              </p>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pr-1">
              <div>
                <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">Product</p>
                <p className="px-2 text-[10px] text-zinc-700">Where you landed</p>
                <div className="mt-2">{renderNavLink(productHubItem, "hub", {})}</div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />

              <div>
                <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                  {workspaceGroup.title}
                </p>
                <p className="px-2 text-[10px] text-zinc-700">{workspaceGroup.blurb}</p>
                <ul className="mt-2 space-y-0.5">
                  {workspaceGroup.items.map((item) => (
                    <li key={item.href}>{renderNavLink(item, "workspace", {})}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-400/50">
                  Other product
                </p>
                <div className="mt-2">{renderNavLink(aidaLaunchItem, "external", {})}</div>
              </div>
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
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/90 backdrop-blur-xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] md:hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <Link
                href={hrefWithQuery("/insights", qs)}
                className="font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400/90"
              >
                Parity
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

          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#07080c]/95 backdrop-blur-xl md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          {mobileQuickLinks.map((item) => {
            const active = isNavActive(pathname, item.href);
            const isHub = item.href === "/";
            return (
              <Link
                key={item.href}
                href={item.href === "/" ? "/" : hrefWithQuery(item.href, qs)}
                scroll={item.href === "/"}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center rounded-lg px-0.5 text-center text-[9px] font-medium leading-tight transition-colors sm:min-h-[48px] sm:text-[10px]",
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                  !active && isHub && "border border-white/10 bg-white/[0.03]",
                  active && isHub && "ring-1 ring-cyan-500/25",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="parity-mobile-dock-pill"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10 max-w-[5.5rem] px-0.5">{item.label}</span>
              </Link>
            );
          })}
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
                <div className="mb-6">
                  <p className="px-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">Product</p>
                  <div className="mt-2">
                    {renderNavLink(productHubItem, "hub", { onNavigate: () => setDrawerOpen(false) })}
                  </div>
                </div>
                <div className="mb-6">
                  <p className="px-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                    {workspaceGroup.title}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {workspaceGroup.items.map((item) => (
                      <li key={`drawer-${item.href}`}>
                        {renderNavLink(item, "workspace", { onNavigate: () => setDrawerOpen(false) })}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-6">
                  <p className="px-2 text-[10px] font-medium uppercase tracking-widest text-violet-400/60">
                    Other product
                  </p>
                  <div className="mt-2">
                    {renderNavLink(aidaLaunchItem, "external", { onNavigate: () => setDrawerOpen(false) })}
                  </div>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ParityNavRailProvider>
  );
}
