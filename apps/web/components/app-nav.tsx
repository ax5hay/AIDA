"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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

function hrefWithQuery(href: string, search: string) {
  if (!search) return href;
  return `${href}?${search}`;
}

export function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-4 py-3 md:px-6">
        <span className="mr-4 shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
          AIDA
        </span>
        {links.map((l) => {
          const active = pathname === l.href;
          const to = hrefWithQuery(l.href, qs);
          return (
            <Link
              key={l.href}
              href={to}
              className={cn(
                "relative shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
