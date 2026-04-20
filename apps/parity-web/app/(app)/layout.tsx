import type { ReactNode } from "react";
import { Suspense } from "react";
import { ParityAppNavLayout } from "@/components/parity-app-nav";
import { getAidaWebBaseFromEnv } from "@/lib/aida-web-url.server";

/** Server reads env each request; use `AIDA_WEB_URL` in repo `.env` for demo (not inlined like `NEXT_PUBLIC_*`). */
export const dynamic = "force-dynamic";

export default function ParityAppLayout({ children }: { children: ReactNode }) {
  const aidaWebBase = getAidaWebBaseFromEnv();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c]" />}>
      <ParityAppNavLayout aidaWebBase={aidaWebBase}>
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
