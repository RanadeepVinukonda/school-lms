import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const ACADEMIC_YEAR_CACHE_KEY = 'lms_active_academic_year';

/**
 * Fetch the current active academic year from the backend settings API.
 * Caches the result in AsyncStorage so it survives app restarts.
 * Falls back to the current calendar year if the request fails.
 */
export async function getActiveAcademicYear(): Promise<string> {
  try {
    const res = await api.get('/settings/system');
    const year = res.data?.data?.academicYear;
    if (year && typeof year === 'string' && year.trim().length > 0) {
      await AsyncStorage.setItem(ACADEMIC_YEAR_CACHE_KEY, year.trim());
      return year.trim();
    }
  } catch {
    // Request failed — try cache
  }

  // Try cache
  try {
    const cached = await AsyncStorage.getItem(ACADEMIC_YEAR_CACHE_KEY);
    if (cached) return cached;
  } catch {
    // Cache unavailable
  }

  return new Date().getFullYear().toString();
}

/**
 * Get the cached academic year without making a network request.
 * Returns null if no cached value exists.
 */
export async function getCachedAcademicYear(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACADEMIC_YEAR_CACHE_KEY);
  } catch {
    return null;
  }
}

/**
 * Build query params with the academic year filter.
 * Appends `academicYear` to existing params for endpoints that support it.
 * Falls back to cached or current year if no explicit year provided.
 */
export async function withAcademicYear(params: Record<string, string | undefined> = {}): Promise<Record<string, string>> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ) as Record<string, string>;

  // If academicYear is not explicitly set, inject the cached/active year
  if (!cleanParams.academicYear && !cleanParams.academic_year) {
    const year = await getActiveAcademicYear();
    cleanParams.academicYear = year;
  }

  return cleanParams;
}

/**
 * Synchronous version for when the year is already known.
 */
export function withAcademicYearSync(
  year: string,
  params: Record<string, string | undefined> = {}
): Record<string, string> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ) as Record<string, string>;

  if (!cleanParams.academicYear && !cleanParams.academic_year) {
    cleanParams.academicYear = year;
  }

  return cleanParams;
}
