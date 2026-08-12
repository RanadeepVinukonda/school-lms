import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { settingsService } from '@/services/settingsService';
import api from '@/services/api';

interface ActiveAcademicYearContextValue {
  /** The currently active academic year string (e.g. "2026" or "2025-2026"). */
  activeYear: string;
  /** All available academic years from the backend (for populating dropdowns). */
  years: string[];
  /** Whether the year data is still loading. */
  loading: boolean;
  /** Switch the active academic year. Persists to settings. */
  setActiveYear: (year: string) => Promise<void>;
  /** Re-fetch from the server. */
  refresh: () => Promise<void>;
}

const ActiveAcademicYearContext = createContext<ActiveAcademicYearContextValue | null>(null);

export function ActiveAcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYearState] = useState<string>('');
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      let year = '';
      let yearLabels: string[] = [];

      // 1) Prefer the admin-configured current academic year (isCurrent record).
      try {
        const res = await api.get('/academic-years');
        const items = res.data?.data?.items ?? res.data?.data ?? [];
        const current = items.find((y: any) => y.isCurrent === true);
        if (current?.name) year = String(current.name);
        yearLabels = items.map((y: any) => y.name || y.code || y.id).filter(Boolean);
      } catch {
        // List fetch failed — fall through to settings/date fallback.
      }

      // 2) Fallback: legacy settings value, then the calendar year.
      if (!year) {
        try {
          const settings = await settingsService.getSettings();
          year = settings?.academicYear || '';
        } catch {
          year = '';
        }
      }
      if (!year) year = new Date().getFullYear().toString();

      setActiveYearState(year);
      setYears(yearLabels.length > 0 ? yearLabels : [year]);
    } catch {
      const fallback = new Date().getFullYear().toString();
      setActiveYearState(fallback);
      setYears([fallback]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveYear = useCallback(async (year: string) => {
    setActiveYearState(year);
    try {
      await settingsService.updateSystemSettings({ academicYear: year });
    } catch {
      // Best-effort persist; context stays optimistic
    }
    // Best-effort: mark the matching academicYears record as current so every
    // backend resolver (report cards, attendance, fees...) follows this choice.
    try {
      const res = await api.get('/academic-years');
      const items = res.data?.data?.items ?? res.data?.data ?? [];
      const match = items.find((y: any) => y.name === year || y.code === year);
      if (match?.id && match.isCurrent !== true) {
        await api.put(`/academic-years/${match.id}`, { isCurrent: true });
      }
    } catch {
      // Best-effort; the settings value above still applies.
    }
    refresh();
  }, [refresh]);

  return (
    <ActiveAcademicYearContext.Provider value={{ activeYear, years, loading, setActiveYear, refresh }}>
      {children}
    </ActiveAcademicYearContext.Provider>
  );
}

/**
 * Hook to access the active academic year context.
 * Throws if used outside of ActiveAcademicYearProvider.
 */
export function useActiveAcademicYear(): ActiveAcademicYearContextValue {
  const ctx = useContext(ActiveAcademicYearContext);
  if (!ctx) {
    throw new Error('useActiveAcademicYear must be used within an <ActiveAcademicYearProvider>');
  }
  return ctx;
}
