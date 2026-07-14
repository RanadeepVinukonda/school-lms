import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../services/supabase';
import { UnauthorizedError } from '../utils/errors';
import { asyncHandler } from './asyncHandler';
import { isTokenRevoked } from './sessionRevocation.middleware';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: string;
        name: string;
        classIds?: string[];
        class_id?: string;
        children_ids?: string[];
        school_id?: string;
        [key: string]: unknown;
      };
      /** The active academic year string (e.g. "2026") resolved by academicYearMiddleware. */
      activeAcademicYear: string;
    }
  }
}

async function _authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new UnauthorizedError('Supabase not configured');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      logger.warn('Auth failed: invalid token', { ip: req.ip, path: req.path, userAgent: req.headers['user-agent'] });
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (await isTokenRevoked(token)) {
      logger.warn('Auth failed: revoked token', { uid: user.id, ip: req.ip, path: req.path });
      throw new UnauthorizedError('Token has been revoked');
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, display_name, class_ids, class_id, children_ids, school_id')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as string) || 'student';

    req.user = {
      uid: user.id,
      email: user.email || '',
      role,
      name: profile?.display_name as string || user.email?.split('@')[0] || 'User',
      classIds: profile?.class_ids || [],
      class_id: profile?.class_id as string || '',
      children_ids: profile?.children_ids as string[] || [],
      school_id: profile?.school_id as string || (user.app_metadata?.school_id as string) || '',
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.warn('Token verification error', { error: error instanceof Error ? error.message : String(error) });
      next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid or expired token'));
    }
  }
}

export const authenticate = asyncHandler(_authenticate);

async function _optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    next();
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    next();
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      next();
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, display_name, school_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      req.user = {
        uid: user.id,
        email: user.email || '',
        role: profile.role as string,
        name: profile.display_name as string || user.email?.split('@')[0] || 'User',
        school_id: profile.school_id as string || '',
      };
    }
    next();
  } catch {
    next();
  }
}

export const optionalAuth = asyncHandler(_optionalAuth);
