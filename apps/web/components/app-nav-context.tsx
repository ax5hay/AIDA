"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Desktop orbital rail is open (272px); when false, main content uses full width below `md`. */
const AppNavRailContext = createContext(true);

export function AppNavRailProvider({ railOpen, children }: { railOpen: boolean; children: ReactNode }) {
  return <AppNavRailContext.Provider value={railOpen}>{children}</AppNavRailContext.Provider>;
}

/** Left padding for fixed UI (e.g. decision dock) so it aligns with the main column beside the rail. */
export function useAppNavRailOffsetClass(): string {
  const railOpen = useContext(AppNavRailContext);
  return railOpen ? "md:pl-[272px]" : "md:pl-0";
}
