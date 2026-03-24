"use client";

import { useCallback, useEffect, useState } from "react";

const KEY_ENABLED = "aida.ai.clientEnabled";
const KEY_MODEL = "aida.ai.model";

export function useAiPreferences(defaultModel: string) {
  const [clientAiEnabled, setClientAiEnabledState] = useState(true);
  const [selectedModel, setSelectedModelState] = useState(defaultModel);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const e = localStorage.getItem(KEY_ENABLED);
    if (e !== null) setClientAiEnabledState(e === "true");
    const m = localStorage.getItem(KEY_MODEL);
    if (m) setSelectedModelState(m);
    setHydrated(true);
  }, []);

  const setClientAiEnabled = useCallback((v: boolean) => {
    setClientAiEnabledState(v);
    localStorage.setItem(KEY_ENABLED, String(v));
  }, []);

  const setSelectedModel = useCallback((v: string) => {
    setSelectedModelState(v);
    localStorage.setItem(KEY_MODEL, v);
  }, []);

  return {
    clientAiEnabled,
    setClientAiEnabled,
    selectedModel,
    setSelectedModel,
    hydrated,
  };
}
