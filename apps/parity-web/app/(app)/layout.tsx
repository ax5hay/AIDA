import type { ReactNode } from "react";
import { Suspense } from "react";
import { ParityAppNavLayout } from "@/components/parity-app-nav";

export default function ParityAppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c]" />}>
      <ParityAppNavLayout>
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
          <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-24">{children}</div>
        </Suspense>
      </ParityAppNavLayout>
    </Suspense>
  );
}
