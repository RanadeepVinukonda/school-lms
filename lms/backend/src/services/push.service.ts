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
  unreadCount?: number,
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
        // Show content on the lock screen (matches 'public' visibility).
        visibility: 'public',
        // System-applied launcher badge count (Android 12+ supported launchers)
        // so the app-icon badge updates even when the app is closed.
        ...(unreadCount && unreadCount > 0 ? { notificationCount: unreadCount } : {}),
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

// ── Android native FCM message builder (data-only) ────────
//
// Android notifications are rendered entirely by the app's native
// GenesisMessagingService (custom FirebaseMessagingService) so they can show the
// full-color Genesis logo, grouped Inbox-style summaries, foreground heads-up
// popups and an accurate launcher badge even when the app is killed. FCM only
// hands `data` to a service's onMessageReceived in every app state — the `data`
// payload below therefore carries everything the native renderer needs
// (title/body/unread count are part of the `notification` block on the web
// message, so they must be duplicated here for Android).

export function buildAndroidDataMessage(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  type?: string,
  unreadCount?: number,
) {
  const category = type ? typeToCategory(type) : 'general';
  const entityId = data?.entityId ?? data?.id;
  const key = collapseKeyFor(type || '', typeof entityId === 'string' ? entityId : undefined);

  const payload = stringifyData(data, type);
  payload.title = title;
  payload.body = body;
  payload.category = category;
  if (unreadCount && unreadCount > 0) payload.unreadCount = String(unreadCount);

  const message: Record<string, unknown> = {
    data: payload,
    tokens,
    android: {
      priority: 'high',
      // No explicit TTL: firebase-admin rejects plain '86400' strings, and FCM's
      // default TTL (4 weeks) is fine for school notifications.
    },
  };

  if (key) {
    (message.android as Record<string, unknown>).collapseKey = key;
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

async function sendFCMPush(
  tokens: string[],
  platform: 'android' | 'web',
  title: string,
  body: string,
  data?: Record<string, unknown>,
  type?: string,
  unreadCount?: number,
) {
  const fcm = await getFirebaseMessaging();
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };
  if (!fcm) {
    logger.warn('Push skipped: FCM not initialized (check FIREBASE_SERVICE_ACCOUNT_KEY)', { tokens: tokens.length });
    return { successCount: 0, failureCount: tokens.length };
  }

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const chunk = tokens.slice(i, i + FCM_BATCH_SIZE);
    // Android gets a data-only message rendered by the native service; web gets
    // the unchanged notification+data message handled by the service worker.
    const message =
      platform === 'android'
        ? buildAndroidDataMessage(chunk, title, body, data, type, unreadCount)
        : buildFCMMessage(chunk, title, body, data, type, unreadCount);
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

  if (!tokens || tokens.length === 0) {
    logger.warn('Push skipped: no active device tokens', { userId, category });
    return;
  }

  // Split tokens by format/platform: Expo push tokens, Android FCM tokens
  // (rendered natively) and web FCM tokens (service-worker rendered).
  const expoTokens: string[] = [];
  const fcmAndroid: string[] = [];
  const fcmWeb: string[] = [];

  for (const t of tokens) {
    if (typeof t.token !== 'string') continue;
    // Auto-detect: explicit platform field OR token format heuristic
    if (t.platform === 'expo' || isExpoPushToken(t.token)) {
      expoTokens.push(t.token);
    } else if (t.platform === 'android') {
      fcmAndroid.push(t.token);
    } else {
      fcmWeb.push(t.token);
    }
  }

  // Send to both channels in parallel
  let unreadCount = 0;
  if (fcmAndroid.length > 0 || fcmWeb.length > 0) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    unreadCount = count || 0;
  }

  const [expoResult, androidResult, webResult] = await Promise.all([
    sendExpoPush(expoTokens, title, body, data),
    sendFCMPush(fcmAndroid, 'android', title, body, data, type, unreadCount),
    sendFCMPush(fcmWeb, 'web', title, body, data, type, unreadCount),
  ]);

  const totalSuccess = expoResult.successCount + androidResult.successCount + webResult.successCount;
  const totalFailure = expoResult.failureCount + androidResult.failureCount + webResult.failureCount;

  if (totalSuccess > 0 || totalFailure > 0) {
    logger.info('Push sent', {
      userId,
      type,
      category,
      expoTokens: expoTokens.length,
      fcmAndroidTokens: fcmAndroid.length,
      fcmWebTokens: fcmWeb.length,
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
