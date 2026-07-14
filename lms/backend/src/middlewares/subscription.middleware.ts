import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { getSupabaseAdmin } from '../services/supabase';

interface PlanLimits {
  studentLimit: number;
  teacherLimit: number;
  features: string[];
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { studentLimit: 100, teacherLimit: 10, features: ['core'] },
  basic: { studentLimit: 500, teacherLimit: 25, features: ['core', 'analytics'] },
  pro: { studentLimit: 2000, teacherLimit: 100, features: ['core', 'analytics', 'mfa', 'api'] },
  enterprise: { studentLimit: 99999, teacherLimit: 9999, features: ['core', 'analytics', 'mfa', 'api', 'sso', 'whitelabel'] },
};

export function requireFeature(feature: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    const supabase = getSupabaseAdmin();
    if (!supabase) return next();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('school_id', req.user.school_id)
      .maybeSingle();

    const plan = sub?.status === 'active' ? (sub.plan || 'free') : 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (!limits.features.includes(feature)) {
      return next(new AppError(403, `Feature "${feature}" requires ${plan === 'free' ? 'an upgraded' : 'a higher'} plan`));
    }

    next();
  };
}
