import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

// Short-TTL in-memory cache so the global middleware doesn't query the DB on
// every request. Invalidated explicitly when an admin changes the current year.
const CACHE_TTL_MS = 60_000;
let cachedYear: string | null = null;
let cachedAt = 0;
let inflight: Promise<string> | null = null;

/** Clear the cached active academic year (call after admin updates it). */
export function invalidateActiveAcademicYearCache(): void {
  cachedYear = null;
  cachedAt = 0;
}

/**
 * Derives the current academic year from the system date.
 * Academic year runs July 1 → June 30 (e.g., July 2026 = "2026-2027").
 * Used only as a fallback when no academic year has been configured in the DB.
 */
export function deriveAcademicYear(date: Date = new Date()): string {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

/**
 * Resolve the active academic year NAME from the admin-configured record
 * (isCurrent: true in the academicYears collection). Falls back to the
 * date-derived convention when nothing is configured yet.
 */
export async function resolveActiveAcademicYear(): Promise<string> {
  const now = Date.now();
  if (cachedYear && now - cachedAt < CACHE_TTL_MS) return cachedYear;
  // Single in-flight guard: concurrent callers share one lookup instead of
  // hammering the DB while the cache is cold (thundering herd protection).
  if (inflight) return inflight;

  inflight = (async () => {
    let resolved = '';
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: rows } = await supabase
          .from('firestore_docs')
          .select('data')
          .eq('collection', 'academicYears')
          .contains('data', { isCurrent: true })
          .limit(1);
        const rec = rows?.[0]?.data as Record<string, unknown> | undefined;
        if (rec && rec.name) resolved = String(rec.name);
      }
    } catch (err) {
      logger.warn('resolveActiveAcademicYear: DB lookup failed, using convention', { error: err });
    }
    if (!resolved) resolved = deriveAcademicYear();
    cachedYear = resolved;
    cachedAt = Date.now();
    return resolved;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Middleware that attaches the active academic year to `req.activeAcademicYear`.
 * Never blocks the request on a DB read: the best known value (fresh cache,
 * stale cache, or the date convention) is served immediately and the
 * configured year is refreshed in the background (single in-flight query).
 */
function _academicYearMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const now = Date.now();
  const fresh = cachedYear && now - cachedAt < CACHE_TTL_MS;
  if (fresh) {
    req.activeAcademicYear = cachedYear as string;
  } else {
    // Serve the last known year (or the convention on a cold cache) now, then
    // refresh in the background. resolveActiveAcademicYear never rejects.
    req.activeAcademicYear = cachedYear || deriveAcademicYear();
    void resolveActiveAcademicYear();
  }
  next();
}

export const academicYearMiddleware = _academicYearMiddleware;
