import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Middleware that reads the active academic year from the settings table
 * and attaches it to `req.activeAcademicYear`.
 *
 * Must run AFTER auth middleware (needs req.user?.school_id) but BEFORE
 * route handlers that filter by academic year.
 *
 * Falls back to current calendar year string if no year is configured.
 */
async function _academicYearMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      req.activeAcademicYear = new Date().getFullYear().toString();
      next();
      return;
    }

    const { data, error } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', 'settings')
      .eq('doc_id', 'general')
      .maybeSingle();

    if (error) {
      logger.warn('Failed to read settings for academic year', { error: error.message });
      req.activeAcademicYear = new Date().getFullYear().toString();
      next();
      return;
    }

    const settings = data?.data as Record<string, unknown> | undefined;
    const year = settings?.academicYear as string | undefined;

    if (year && year.trim().length > 0) {
      req.activeAcademicYear = year.trim();
    } else {
      req.activeAcademicYear = new Date().getFullYear().toString();
    }

    next();
  } catch (err) {
    // Never fail the request over academic year resolution
    logger.error('Academic year middleware error', {
      error: err instanceof Error ? err.message : String(err),
    });
    req.activeAcademicYear = new Date().getFullYear().toString();
    next();
  }
}

export const academicYearMiddleware = _academicYearMiddleware;
