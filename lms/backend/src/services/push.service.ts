import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getSupabaseAdmin } from './supabase';
import { typeToCategory, categoryToChannelId, collapseKeyFor } from './push.mappings';

// ── Firebase Admin SDK initialization ────────────────────
let firebaseApp: any = null;
let fcmMessaging: any = null;

async function getFirebaseMessaging() {
  if (fcmMessaging) return fcmMessaging;
  if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) return null;
  try {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    fcmMessaging = getMessaging(firebaseApp);
    return fcmMessaging;
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: err });
    return null;
  }
}

// ── Token format detection ───────────────────────────────

function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('expo_push_token[');
}

function stringifyData(data?: Record<string, unknown>, type?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (type) out.type = type;
  if (type) out.category = typeToCategory(type);
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      out[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
    }
  }
  return out;
}

// ── FCM message builder (exported for unit testing) ──────

export function buildFCMMessage(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  type?: string,
) {
  const category = type ? typeToCategory(type) : 'general';
  const entityId = data?.entityId ?? data?.id;
  const key = collapseKeyFor(type || '', typeof entityId === 'string' ? entityId : undefined);

  const message: Record<string, unknown> = {
    notification: { title, body },
    data: stringifyData(data, type),
    tokens,
    android: {
      priority: 'high',
      notification: {
        channelId: categoryToChannelId(category),
        sound: 'default',
        color: '#2563eb',
        icon: 'ic_stat_genesis',
      },
    },
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
    },
  };

  if (key) {
    (message.android as Record<string, unknown>).collapseKey = key;
    ((message.android as any).notification.tag) = key;
  }

  return message;
}

// ── Expo Push API helper ─────────────────────────────────

async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  if (!env.EXPO_ACCESS_TOKEN || tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data: data ? stringifyData(data) : undefined,
  }));

  // Expo accepts batch of up to 100
  const BATCH_SIZE = 100;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(10_000),
      });

      const json = (await res.json()) as { data?: Array<{ status?: string; message?: string }> };
      const results = json.data || [];

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'ok') {
          successCount++;
        } else {
          failureCount++;
          const msg = r.message || '';
          if (msg.includes('DeviceNotRegistered') || msg.includes('InvalidCredentials')) {
            const staleToken = batch[j]?.to;
            if (staleToken) {
              const supabase = getSupabaseAdmin();
              if (supabase) {
                await supabase.from('device_tokens').update({ deleted_at: new Date().toISOString() }).eq('token', staleToken);
              }
            }
          }
        }
      }
    } catch (err) {
      failureCount += batch.length;
      logger.error('Expo push batch failed', { error: err });
    }
  }

  return { successCount, failureCount };
}

// ── FCM push helper ──────────────────────────────────────

const FCM_BATCH_SIZE = 500;
const TRANSIENT_CODES = new Set([
  'messaging/server-unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
  'messaging/third-party-auth-error',
  'app/network-error',
  'messaging/message-rate-exceeded',
]);

async function sendFCMChunkWithRetry(fcm: any, message: Record<string, unknown>, attempt = 0): Promise<{
  successCount: number;
  failureCount: number;
  responses?: Array<{ success: boolean; error?: { code?: string } }>;
}> {
  try {
    const response = await fcm.sendEachForMulticast(message);
    return {
      successCount: response.successCount || 0,
      failureCount: response.failureCount || 0,
      responses: response.responses,
    };
  } catch (err: any) {
    const code = err?.errorInfo?.code || err?.code || '';
    if (TRANSIENT_CODES.has(code) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 500));
      return sendFCMChunkWithRetry(fcm, message, attempt + 1);
    }
    logger.error('FCM multicast failed', { error: err, code });
    return { successCount: 0, failureCount: (message.tokens as string[]).length };
  }
}

async function cleanupStaleTokens(tokens: string[], responses: Array<{ success: boolean; error?: { code?: string } }>, baseIndex: number) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !responses) return;
  for (let j = 0; j < responses.length; j++) {
    const r = responses[j];
    if (!r.success && r.error) {
      const code = r.error.code || '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        await supabase.from('device_tokens').update({ deleted_at: new Date().toISOString() }).eq('token', tokens[baseIndex + j]);
      }
    }
  }
}

async function sendFCMPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>, type?: string) {
  const fcm = await getFirebaseMessaging();
  if (!fcm || tokens.length === 0) return { successCount: 0, failureCount: 0 };

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const chunk = tokens.slice(i, i + FCM_BATCH_SIZE);
    const message = buildFCMMessage(chunk, title, body, data, type);
    const result = await sendFCMChunkWithRetry(fcm, message);

    // Clean up stale tokens from this chunk
    if (result.responses) {
      await cleanupStaleTokens(tokens, result.responses, i);
    }

    successCount += result.successCount;
    failureCount += result.failureCount;
  }

  return { successCount, failureCount };
}

// ── Main send function ───────────────────────────────────

export async function sendPush(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // Per-category push preference (notification_preferences table)
  const category = typeToCategory(type);
  const { data: catPref } = await supabase
    .from('notification_preferences')
    .select('push_enabled')
    .eq('user_id', userId)
    .eq('category', category)
    .maybeSingle();
  if (catPref && catPref.push_enabled === false) return;

  // Check user-level push preference from the users JSONB column
  const { data: user } = await supabase
    .from('users')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle();

  if (user) {
    const prefs = user.notification_preferences || {};
    const pushEnabled = prefs.push ?? prefs.push_enabled ?? true;
    if (!pushEnabled) return;
  }

  // Fetch active (non-deleted) device tokens
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (!tokens || tokens.length === 0) return;

  // Split tokens by format: Expo push tokens vs FCM tokens
  const expoTokens: string[] = [];
  const fcmTokens: string[] = [];

  for (const t of tokens) {
    if (typeof t.token !== 'string') continue;
    // Auto-detect: explicit platform field OR token format heuristic
    if (t.platform === 'expo' || isExpoPushToken(t.token)) {
      expoTokens.push(t.token);
    } else {
      fcmTokens.push(t.token);
    }
  }

  // Send to both channels in parallel
  const [expoResult, fcmResult] = await Promise.all([
    sendExpoPush(expoTokens, title, body, data),
    sendFCMPush(fcmTokens, title, body, data, type),
  ]);

  const totalSuccess = expoResult.successCount + fcmResult.successCount;
  const totalFailure = expoResult.failureCount + fcmResult.failureCount;

  if (totalSuccess > 0 || totalFailure > 0) {
    logger.info('Push sent', {
      userId,
      type,
      category,
      expoTokens: expoTokens.length,
      fcmTokens: fcmTokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });
  }
}

export async function sendPushBulk(notifications: Array<{ userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }>) {
  // Group by userId to batch token lookups
  const byUser = new Map<string, Array<{ type: string; title: string; body: string; data?: Record<string, unknown> }>>();
  for (const n of notifications) {
    const existing = byUser.get(n.userId) || [];
    existing.push({ type: n.type, title: n.title, body: n.body, data: n.data });
    byUser.set(n.userId, existing);
  }

  // Send in parallel with a concurrency limit of 10
  const CONCURRENCY = 10;
  const entries = Array.from(byUser.entries());
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(([userId, items]) => {
        const latest = items[items.length - 1];
        return sendPush(userId, latest.type, latest.title, latest.body, latest.data);
      }),
    );
  }
}
