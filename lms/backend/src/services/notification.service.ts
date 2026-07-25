import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendPush, sendPushBulk } from './push.service';

// ── Public API ───────────────────────────────────────────

const supabase = () => getSupabaseAdmin()!;

/** Create a single notification for a user. */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: string;
  schoolId?: string;
}) {
  const prefs = await getNotificationPreferences(data.userId);
  if (!prefs.in_app_enabled) {
    logger.info('Skipping in-app notification (user preference)', { userId: data.userId });
    return null;
  }

  let school_id = data.schoolId;
  if (!school_id) {
    const { data: user } = await supabase().from('users').select('school_id').eq('id', data.userId).maybeSingle();
    school_id = user?.school_id as string | undefined;
  }

  const row: Record<string, unknown> = {
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  if (school_id) row.school_id = school_id;

  const { data: inserted, error } = await supabase().from('notifications').insert(row).select('id').single();
  if (error) throw new Error(`Failed to create notification: ${error.message}`);

  sendPush(data.userId, data.type, data.title, data.body, data.data);
  return inserted;
}

/** Get notifications for a user, with optional unreadOnly filter, paginated. */
export async function getNotificationsByUser(userId: string, query: {
  page?: string;
  limit?: string;
  unreadOnly?: string;
}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;

  let baseQuery = supabase()
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (query.unreadOnly === 'true') {
    baseQuery = baseQuery.eq('read', false);
  }

  const { data: items, count, error } = await baseQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (items || []).map((n: any) => ({
      ...n,
      userId: n.userId,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    total: count || 0,
    page,
    limit,
  };
}

/** Mark a single notification as read. Verifies ownership. */
export async function markNotificationRead(notificationId: string, userId: string) {
  const { data: existing } = await supabase()
    .from('notifications').select('id, "userId"').eq('id', notificationId).maybeSingle();
  if (!existing || existing.userId !== userId) {
    throw new NotFoundError('Notification not found');
  }
  const { error } = await supabase()
    .from('notifications').update({ read: true, readAt: new Date().toISOString() }).eq('id', notificationId);
  if (error) throw error;
  logger.info('Notification marked as read', { notificationId });
}

/** Mark all unread notifications as read for a user. */
export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase()
    .from('notifications')
    .update({ read: true, readAt: new Date().toISOString() })
    .eq('userId', userId)
    .eq('read', false);
  if (error) throw error;
  logger.info('All notifications marked as read', { userId });
}

/** Get the count of unread notifications for a user. */
export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('userId', userId)
    .eq('read', false);
  if (error) throw error;
  return { count: count || 0 };
}

/** Delete a notification by id. Verifies ownership. */
export async function deleteNotification(notificationId: string, userId: string) {
  const { data: existing } = await supabase()
    .from('notifications').select('id, "userId"').eq('id', notificationId).maybeSingle();
  if (!existing || existing.userId !== userId) {
    throw new NotFoundError('Notification not found');
  }
  const { error } = await supabase().from('notifications').delete().eq('id', notificationId);
  if (error) throw error;
  logger.info('Notification deleted', { notificationId });
}

/** Fetch notification preferences for a user, returning defaults if not set. */
export async function getNotificationPreferences(userId: string) {
  const { data: row, error } = await supabase()
    .from('users')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new NotFoundError('User not found');

  const defaultPreferences = { email: true, push: true, sms: false, in_app_enabled: true };
  const prefs = row.notification_preferences || defaultPreferences;
  return {
    email: prefs.email ?? true,
    push: prefs.push ?? true,
    sms: prefs.sms ?? false,
    in_app_enabled: prefs.inApp ?? prefs.in_app_enabled ?? true,
  };
}

/** Update notification preferences for a user. */
export async function updateNotificationPreferences(userId: string, preferences: {
  email: boolean; push: boolean; sms: boolean; in_app_enabled: boolean;
}) {
  const { data: row, error: findError } = await supabase()
    .from('users').select('id').eq('id', userId).maybeSingle();
  if (findError || !row) throw new NotFoundError('User not found');

  const { error } = await supabase()
    .from('users')
    .update({
      notification_preferences: {
        email: preferences.email, push: preferences.push,
        sms: preferences.sms, in_app_enabled: preferences.in_app_enabled,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
  logger.info('Notification preferences updated', { userId });
  return preferences;
}

/** Create multiple notifications in a single batch. */
export async function createBulkNotifications(
  notifications: Array<{ userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }>,
) {
  if (notifications.length === 0) return [];
  const db = supabase();

  const userIds = [...new Set(notifications.map((n) => n.userId))];
  const { data: users } = await db
    .from('users').select('id, notification_preferences, school_id').in('id', userIds);

  const prefsMap = new Map<string, { in_app_enabled: boolean }>();
  const schoolMap = new Map<string, string>();
  for (const u of users || []) {
    const prefs = u.notification_preferences || {};
    prefsMap.set(u.id, { in_app_enabled: prefs.inApp ?? prefs.in_app_enabled ?? true });
    if (u.school_id) schoolMap.set(u.id, u.school_id as string);
  }

  const rows = notifications
    .filter((n) => prefsMap.get(n.userId)?.in_app_enabled !== false)
    .map((n) => {
      const r: Record<string, unknown> = {
        userId: n.userId, type: n.type,
        title: n.title, message: n.body,
        read: false, createdAt: new Date().toISOString(),
      };
      const sid = schoolMap.get(n.userId);
      if (sid) r.school_id = sid;
      return r;
    });

  const results: string[] = [];
  if (rows.length > 0) {
    const { data: inserted, error } = await db.from('notifications').insert(rows).select('id');
    if (error) {
      logger.error('Failed to create bulk notifications', { error: error.message });
    } else if (inserted) {
      results.push(...inserted.map((r: any) => r.id as string));
    }
  }

  logger.info('Bulk notifications created', { count: results.length });
  sendPushBulk(notifications);
  return results;
}
