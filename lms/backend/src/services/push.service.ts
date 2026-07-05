import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getSupabaseAdmin } from './supabase';
import crypto from 'crypto';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set, FCM push disabled');
    return null;
  }

  try {
    const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as {
      client_email: string;
      private_key: string;
      project_id: string;
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createSign('sha256').update(`${header}.${body}`).sign(sa.private_key, 'base64url');
    const assertion = `${header}.${body}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!res.ok) {
      logger.error('Failed to get FCM access token', { status: res.status });
      return null;
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 - 60000 };
    return json.access_token;
  } catch (err) {
    logger.error('Failed to get FCM access token', err);
    return null;
  }
}

export async function sendPush(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  if (!accessToken) return;

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

  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY!) as { project_id: string };
  const projectId = sa.project_id;
  let successCount = 0;
  let failureCount = 0;

  for (const t of tokens) {
    const fcmData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        fcmData[k] = String(v);
      }
    }

    const message = {
      message: {
        token: t.token,
        notification: { title, body },
        data: fcmData,
      },
    };

    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      });

      if (res.ok) {
        successCount++;
      } else {
        failureCount++;
        const errBody = (await res.json()) as { error?: { status?: string } };
        if (errBody.error?.status === 'UNREGISTERED') {
          const { error: deleteError } = await supabase.from('device_tokens').delete().eq('token', t.token);
          if (deleteError) throw new Error(`Failed to delete device token: ${deleteError.message}`);
          logger.info('Cleaned up stale device token');
        }
      }
    } catch (err) {
      failureCount++;
      logger.error('FCM push failed for token', { error: err });
    }
  }

  logger.info('FCM push sent', { userId, type, successCount, failureCount });
}

export async function sendPushBulk(notifications: Array<{ userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }>) {
  for (const n of notifications) {
    await sendPush(n.userId, n.type, n.title, n.body, n.data);
  }
}
