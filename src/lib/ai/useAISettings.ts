"use client";

import { useCallback, useEffect, useState } from "react";

import { PROVIDERS, type ProviderId } from "./providers";

export interface AISettings {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const STORAGE_KEY = "agentlint.ai.v1";

const isValid = (s: AISettings | null): s is AISettings =>
  Boolean(s && s.provider && s.apiKey.trim() && s.model.trim());

const read = (): AISettings | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    if (!parsed.provider || !(parsed.provider in PROVIDERS)) return null;
    return {
      provider: parsed.provider,
      apiKey: parsed.apiKey ?? "",
      model: parsed.model ?? PROVIDERS[parsed.provider].defaultModel,
      baseUrl: parsed.baseUrl ?? "",
    };
  } catch {
    return null;
  }
};

/**
 * BYOK settings, persisted to localStorage. The key lives only in the user's
 * browser and is sent only to the provider they choose.
 */
export const useAISettings = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(read());
    setHydrated(true);
  }, []);

  const save = useCallback((next: AISettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage may be unavailable (private mode); keep in-memory only
    }
  }, []);

  const clear = useCallback(() => {
    setSettings(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    settings,
    /** True once localStorage has been read (avoids SSR/client flash). */
    hydrated,
    /** True when settings are present and complete enough to call a provider. */
    configured: isValid(settings),
    save,
    clear,
  };
};
