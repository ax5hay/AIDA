"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AnalyticsFilters } from "@/lib/query-params";
import { filtersKey, parseFiltersFromSearchParams } from "@/lib/query-params";

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch: Partial<AnalyticsFilters>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const key of Object.keys(patch) as (keyof AnalyticsFilters)[]) {
        const v = patch[key];
        if (v === undefined || v === "") p.delete(key);
        else p.set(key, v);
      }
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return { filters, setFilters, clearFilters, filtersKey: filtersKey(filters) };
}
