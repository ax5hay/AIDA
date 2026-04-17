import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppNavLayout } from "@/components/app-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c]" />}>
      <AppNavLayout>
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
      </AppNavLayout>
    </Suspense>
  );
}
