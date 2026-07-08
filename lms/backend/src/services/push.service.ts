import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getSupabaseAdmin } from './supabase';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function sendPush(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
  if (!env.EXPO_ACCESS_TOKEN) {
    logger.warn('EXPO_ACCESS_TOKEN not set, push disabled');
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('push_enabled')
    .eq('user_id', userId)
    .eq('category', type)
    .single();

  if (prefs && !prefs.push_enabled) return;

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) return;

  let successCount = 0;
  let failureCount = 0;

  for (const t of tokens) {
    if (typeof t.token !== 'string') continue;

    try {
      const res = await fetchWithTimeout('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: t.token,
          title,
          body,
          data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        }),
      });

      const json = (await res.json()) as { data?: { status?: string; message?: string } };
      const status = json.data?.status;

      if (status === 'ok') {
        successCount++;
      } else {
        failureCount++;
        const msg = json.data?.message || '';
        if (msg.includes('DeviceNotRegistered') || msg.includes('InvalidCredentials')) {
          await supabase.from('device_tokens').update({ deleted_at: new Date().toISOString() }).eq('token', t.token);
          logger.info('Cleaned up stale device token');
        }
      }
    } catch (err) {
      failureCount++;
      logger.error('Expo push failed for token', { error: err });
    }
  }

  logger.info('Expo push sent', { userId, type, successCount, failureCount });
}

export async function sendPushBulk(notifications: Array<{ userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }>) {
  for (const n of notifications) {
    await sendPush(n.userId, n.type, n.title, n.body, n.data);
  }
}
