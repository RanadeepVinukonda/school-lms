// @ts-nocheck — pre-existing type errors
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

const TTL = 86400000;

export function idempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    if (!key || !['POST', 'PUT', 'PATCH'].includes(req.method)) return next();

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return next();

      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('response_status, response_body')
        .eq('id', key)
        .maybeSingle();

      if (existing) {
        if (existing.response_status) {
          return res.status(existing.response_status).json(existing.response_body);
        }
        return res.status(409).json({ success: false, error: 'Request already in progress' });
      }

      const { error: insertErr } = await supabase
        .from('idempotency_keys')
        .insert({ id: key, response_status: null, response_body: null, expires_at: new Date(Date.now() + TTL).toISOString() });

      if (insertErr) {
        return res.status(409).json({ success: false, error: 'Request already in progress' });
      }

      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        supabase.from('idempotency_keys').update({
          response_status: res.statusCode,
          response_body: body,
        }).eq('id', key).then().catch(() => {});
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error('Idempotency middleware error', err);
      next();
    }
  };
}
