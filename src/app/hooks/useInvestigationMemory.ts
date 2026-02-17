import { useCallback } from "react";

export interface InvestigationMemoryRecord {
  item: string | null;
  intent: string;
  timestamp: number;
}

const STORAGE_KEY = "nerdvana_case";

export function useInvestigationMemory() {
  const save = useCallback((data: InvestigationMemoryRecord) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const load = useCallback((): InvestigationMemoryRecord | null => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as InvestigationMemoryRecord;
    } catch {
      return null;
    }
  }, []);

  return { save, load };
}
