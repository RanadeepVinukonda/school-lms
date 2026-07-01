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
        school_id?: string;
        [key: string]: unknown;
      };
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
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (await isTokenRevoked(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, display_name, class_ids, school_id')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as string) || 'student';

    req.user = {
      uid: user.id,
      email: user.email || '',
      role,
      name: profile?.display_name as string || user.email?.split('@')[0] || 'User',
      classIds: profile?.class_ids || [],
      school_id: profile?.school_id as string || (user.app_metadata?.school_id as string) || '',
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.warn('Token verification error', { error: error instanceof Error ? error.message : String(error) });
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

export const authenticate = asyncHandler(_authenticate);

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
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

  supabase.auth.getUser(token)
    .then(async ({ data: { user }, error }) => {
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
    })
    .catch(() => {
      next();
    });
}
