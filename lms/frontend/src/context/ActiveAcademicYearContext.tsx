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
      const settings = await settingsService.getSettings();
      const year = settings?.academicYear || new Date().getFullYear().toString();
      setActiveYearState(year);

      // Also try to get all academic years from the backend
      try {
        const res = await api.get('/academic-years');
        const items = res.data?.data?.items ?? res.data?.data ?? [];
        const yearLabels = items.map((y: any) => y.name || y.code || y.id).filter(Boolean);
        if (yearLabels.length > 0) {
          setYears(yearLabels);
        } else {
          // Fallback: use the single current year
          setYears([year]);
        }
      } catch {
        // If fetching academic years list fails, provide the current year as the only option
        setYears([year]);
      }
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
  }, []);

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
