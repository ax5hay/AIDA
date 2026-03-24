import { keepPreviousData } from "@tanstack/react-query";

/** Matches server-side overview/section/correlation cache (~30s); avoids refetch thrash on tab focus. */
export const ANALYTICS_STALE_MS = 25_000;

export const analyticsQueryDefaults = {
  staleTime: ANALYTICS_STALE_MS,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

/** Use when the query key includes filter params — keeps prior chart data visible while new range loads. */
export const analyticsFilteredQuery = {
  ...analyticsQueryDefaults,
  placeholderData: keepPreviousData,
} as const;
