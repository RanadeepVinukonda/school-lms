import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { sendPush, sendPushBulk } from './push.service';

/** Create a single notification for a user. */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: string;
}) {
  const notificationId = uuidv4();
  const now = new Date().toISOString();

  // ponytail: check inApp preference before writing
  const prefs = await getNotificationPreferences(data.userId);
  if (!prefs.in_app_enabled) {
    logger.info('Skipping in-app notification (user preference)', { userId: data.userId });
    return null;
  }

  const notification = {
    id: notificationId,
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data || {},
    priority: data.priority || 'normal',
    read: false,
    read_at: null,
    created_at: now,
    school_id: null,
  };

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from('notifications').insert(notification);
  if (error) throw error;

  sendPush(data.userId, data.type, data.title, data.body, data.data);

  return { ...notification, userId: data.userId, readAt: null, createdAt: now };
}

/** Get notifications for a user, with optional unreadOnly filter, paginated by createdAt desc. */
export async function getNotificationsByUser(userId: string, query: {
  page?: string;
  limit?: string;
  unreadOnly?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let baseQuery = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
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
  const supabase = getSupabaseAdmin()!;
  
  const { data: row, error: findError } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('id', notificationId)
    .maybeSingle();

  if (findError || !row) {
    throw new NotFoundError('Notification not found');
  }

  if (row.user_id !== userId) {
    throw new NotFoundError('Notification not found');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;

  logger.info('Notification marked as read', { notificationId });
}

/** Mark all unread notifications as read for a user, using batch writes. */
export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error: findError } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('read', false);

  if (findError) throw findError;

  if (rows && rows.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (error) throw error;
  }

  logger.info('All notifications marked as read', { userId, count: rows?.length || 0 });
}

/** Get the count of unread notifications for a user. */
export async function getUnreadCount(userId: string) {
  const supabase = getSupabaseAdmin()!;
  
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;

  return { count: count || 0 };
}

/** Delete a notification by id. Verifies ownership. */
export async function deleteNotification(notificationId: string, userId: string) {
  const supabase = getSupabaseAdmin()!;
  
  const { data: row, error: findError } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('id', notificationId)
    .maybeSingle();

  if (findError || !row) {
    throw new NotFoundError('Notification not found');
  }

  if (row.user_id !== userId) {
    throw new NotFoundError('Notification not found');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
  
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

  if (!row) {
    throw new NotFoundError('User not found');
  }

  const defaultPreferences = {
    email: true,
    push: true,
    sms: false,
    in_app_enabled: true,
  };

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
  email: boolean;
  push: boolean;
  sms: boolean;
  in_app_enabled: boolean;
}) {
  const supabase = getSupabaseAdmin()!;
  
  const { data: row, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (findError || !row) {
    throw new NotFoundError('User not found');
  }

  const { error } = await supabase
    .from('users')
    .update({
      notification_preferences: {
        email: preferences.email,
        push: preferences.push,
        sms: preferences.sms,
        in_app_enabled: preferences.in_app_enabled,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  logger.info('Notification preferences updated', { userId });

  return preferences;
}

/** Create multiple notifications in a single batch write. Batches preference lookups to avoid N+1 queries. */
export async function createBulkNotifications(
  notifications: Array<{
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>
) {
  if (notifications.length === 0) return [];
  const supabase = getSupabaseAdmin()!;

  // Batch-fetch all unique user preferences in a single query
  const userIds = [...new Set(notifications.map((n) => n.userId))];
  const { data: users } = await supabase
    .from('users')
    .select('id, notification_preferences')
    .in('id', userIds);

  const prefsMap = new Map<string, { in_app_enabled: boolean }>();
  for (const u of users || []) {
    const prefs = u.notification_preferences || {};
    prefsMap.set(u.id, {
      in_app_enabled: prefs.inApp ?? prefs.in_app_enabled ?? true,
    });
  }

  const now = new Date().toISOString();
  const rows = notifications
    .filter((n) => prefsMap.get(n.userId)?.in_app_enabled !== false)
    .map((n) => ({
      id: uuidv4(),
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || {},
      priority: 'normal',
      read: false,
      read_at: null,
      created_at: now,
    }));

  const results: string[] = [];
  if (rows.length > 0) {
    const { data: inserted, error } = await supabase.from('notifications').insert(rows).select('id');
    if (!error && inserted) {
      results.push(...inserted.map((r: any) => r.id as string));
    }
  }

  logger.info('Bulk notifications created', { count: results.length });
  sendPushBulk(notifications);

  return results;
}