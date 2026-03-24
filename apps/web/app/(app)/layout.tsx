import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { DecisionSupportDock } from "@/components/decision-support-dock";

function NavWithSuspense() {
  return (
    <Suspense fallback={<div className="h-12 border-b border-white/10 bg-[#07080c]/80" />}>
      <AppNav />
    </Suspense>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavWithSuspense />
      <Suspense
        fallback={
          <div className="min-h-[60vh] bg-[#07080c]">
            <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 sm:pt-12">
              <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
              <div className="mt-8 h-32 animate-pulse rounded-xl bg-white/5" />
            </div>
          </div>
        }
      >
        <div className="pb-[calc(11rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </Suspense>
      <Suspense fallback={null}>
        <DecisionSupportDock />
      </Suspense>
    </>
  );
}
