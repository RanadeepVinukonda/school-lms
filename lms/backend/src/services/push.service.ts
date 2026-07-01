import { initializeApp, cert, getApps, getApp } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getSupabaseAdmin } from './supabase';

function getAppInstance() {
  if (getApps().length > 0) return getApp();
  if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set, FCM push disabled');
    return null;
  }
  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin', err);
    return null;
  }
}

export async function sendPush(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
  const app = getAppInstance();
  if (!app) return;

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

  const message = {
    tokens: tokens.map(t => t.token),
    notification: { title, body },
    data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
  };

  try {
    const result = await getMessaging().sendEachForMulticast(message);
    logger.info('FCM push sent', { userId, type, success: result.successCount, failure: result.failureCount });
    if (result.failureCount > 0) {
      const invalidTokens: string[] = [];
      result.responses.forEach((resp, i) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[i].token);
        }
      });
      if (invalidTokens.length > 0) {
        await supabase.from('device_tokens').delete().in('token', invalidTokens);
        logger.info('Cleaned up stale device tokens', { count: invalidTokens.length });
      }
    }
  } catch (err) {
    logger.error('FCM push failed', { userId, type, error: err });
  }
}

export async function sendPushBulk(notifications: Array<{ userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }>) {
  for (const n of notifications) {
    await sendPush(n.userId, n.type, n.title, n.body, n.data);
  }
}
