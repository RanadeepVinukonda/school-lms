import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendPush, sendPushBulk } from './push.service';
import { BaseService, DbRecord } from '../lib/base-service';

// ── Notification Base Service (for standard CRUD) ────────

interface NotificationRecord extends DbRecord {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: string;
  read: boolean;
  read_at: string | null;
  school_id?: string;
}

class NotificationBaseService extends BaseService<NotificationRecord> {
  protected readonly table = 'notifications';
  protected softDelete = true;
}

const notificationBase = new NotificationBaseService();

// ── Public API ───────────────────────────────────────────

/** Create a single notification for a user. */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: string;
}) {
  // ponytail: check inApp preference before writing
  const prefs = await getNotificationPreferences(data.userId);
  if (!prefs.in_app_enabled) {
    logger.info('Skipping in-app notification (user preference)', { userId: data.userId });
    return null;
  }

  const now = new Date().toISOString();
  const notification = {
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data || {},
    priority: data.priority || 'normal',
    read: false,
    read_at: null,
    created_at: now,
  };

  const result = await notificationBase.create(notification as any);
  sendPush(data.userId, data.type, data.title, data.body, data.data);
  return result;
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

  const supabase = getSupabaseAdmin()!;
  let baseQuery = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (query.unreadOnly === 'true') {
    baseQuery = baseQuery.eq('read', false);
  }

  const { data: items, count, error } = await baseQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (items || []).map((n: any) => ({
      ...n,
      userId: n.user_id,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    total: count || 0,
    page,
    limit,
  };
}

/** Mark a single notification as read. Verifies ownership. */
export async function markNotificationRead(notificationId: string, userId: string) {
  const existing = await notificationBase.findById(notificationId);
  if (!existing || existing.user_id !== userId) {
    throw new NotFoundError('Notification not found');
  }
  await notificationBase.update(notificationId, { read: true, read_at: new Date().toISOString() } as any);
  logger.info('Notification marked as read', { notificationId });
}

/** Mark all unread notifications as read for a user. */
export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
    .is('deleted_at', null);
  if (error) throw error;
  logger.info('All notifications marked as read', { userId });
}

/** Get the count of unread notifications for a user. */
export async function getUnreadCount(userId: string) {
  const supabase = getSupabaseAdmin()!;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
    .is('deleted_at', null);
  if (error) throw error;
  return { count: count || 0 };
}

/** Delete (soft-delete) a notification by id. Verifies ownership. */
export async function deleteNotification(notificationId: string, userId: string) {
  const existing = await notificationBase.findById(notificationId);
  if (!existing || existing.user_id !== userId) {
    throw new NotFoundError('Notification not found');
  }
  await notificationBase.delete(notificationId);
  logger.info('Notification deleted', { notificationId });
}

/** Fetch notification preferences for a user, returning defaults if not set. */
export async function getNotificationPreferences(userId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: row, error } = await supabase
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
  const supabase = getSupabaseAdmin()!;
  const { data: row, error: findError } = await supabase
    .from('users').select('id').eq('id', userId).maybeSingle();
  if (findError || !row) throw new NotFoundError('User not found');

  const { error } = await supabase
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
  const supabase = getSupabaseAdmin()!;

  const userIds = [...new Set(notifications.map((n) => n.userId))];
  const { data: users } = await supabase
    .from('users').select('id, notification_preferences').in('id', userIds);

  const prefsMap = new Map<string, { in_app_enabled: boolean }>();
  for (const u of users || []) {
    const prefs = u.notification_preferences || {};
    prefsMap.set(u.id, { in_app_enabled: prefs.inApp ?? prefs.in_app_enabled ?? true });
  }

  const now = new Date().toISOString();
  const rows = notifications
    .filter((n) => prefsMap.get(n.userId)?.in_app_enabled !== false)
    .map((n) => ({
      id: uuidv4(), user_id: n.userId, type: n.type,
      title: n.title, body: n.body, data: n.data || {},
      priority: 'normal', read: false, read_at: null, created_at: now,
    }));

  const results: string[] = [];
  if (rows.length > 0) {
    const { data: inserted, error } = await supabase.from('notifications').insert(rows).select('id');
    if (!error && inserted) results.push(...inserted.map((r: any) => r.id as string));
  }

  logger.info('Bulk notifications created', { count: results.length });
  sendPushBulk(notifications);
  return results;
}
