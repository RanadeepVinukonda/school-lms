import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

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

  const notification = {
    id: notificationId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data || {},
    priority: data.priority || 'normal',
    read: false,
    readAt: null,
    createdAt: now,
  };

  await collections.notifications().doc(notificationId).set(notification);

  return { ...notification };
}

/** Get notifications for a user, with optional unreadOnly filter, paginated by createdAt desc. */
export async function getNotificationsByUser(userId: string, query: {
  page?: string;
  limit?: string;
  unreadOnly?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.notifications()
    .where('userId', '==', userId);

  if (query.unreadOnly === 'true') {
    baseQuery = baseQuery.where('read', '==', false);
  }

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

/** Mark a single notification as read. Verifies ownership. */
export async function markNotificationRead(notificationId: string, userId: string) {
  const ref = collections.notifications().doc(notificationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Notification not found');
  }

  const data = doc.data()!;
  if (data.userId !== userId) {
    throw new NotFoundError('Notification not found');
  }

  await ref.update({
    read: true,
    readAt: new Date().toISOString(),
  });

  logger.info('Notification marked as read', { notificationId });
}

/** Mark all unread notifications as read for a user, using a batch write. */
export async function markAllNotificationsRead(userId: string) {
  const snapshot = await collections.notifications()
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  const batch = collections.notifications().firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      readAt: new Date().toISOString(),
    });
  });

  await batch.commit();

  logger.info('All notifications marked as read', { userId, count: snapshot.docs.length });
}

/** Get the count of unread notifications for a user. */
export async function getUnreadCount(userId: string) {
  const snapshot = await collections.notifications()
    .where('userId', '==', userId)
    .where('read', '==', false)
    .count()
    .get();

  return { count: snapshot.data().count };
}

/** Delete a notification by id. Verifies ownership. */
export async function deleteNotification(notificationId: string, userId: string) {
  const ref = collections.notifications().doc(notificationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Notification not found');
  }

  const data = doc.data()!;
  if (data.userId !== userId) {
    throw new NotFoundError('Notification not found');
  }

  await ref.delete();
  logger.info('Notification deleted', { notificationId });
}

/** Fetch notification preferences for a user, returning defaults if not set. */
export async function getNotificationPreferences(userId: string) {
  const ref = collections.users().doc(userId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('User not found');
  }

  const userData = doc.data()!;
  const defaultPreferences = {
    email: true,
    push: true,
    sms: false,
    inApp: true,
  };

  return userData.notificationPreferences || defaultPreferences;
}

/** Update notification preferences for a user. */
export async function updateNotificationPreferences(userId: string, preferences: {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}) {
  const ref = collections.users().doc(userId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('User not found');
  }

  await ref.update({
    notificationPreferences: preferences,
    updatedAt: new Date().toISOString(),
  });

  logger.info('Notification preferences updated', { userId });

  return preferences;
}

/** Create multiple notifications in a single batch write. */
export async function createBulkNotifications(
  notifications: Array<{
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>
) {
  const batch = collections.notifications().firestore.batch();
  const results = [];

  for (const notif of notifications) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const notification = {
      id,
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
      priority: 'normal',
      read: false,
      readAt: null,
      createdAt: now,
    };

    batch.set(collections.notifications().doc(id), notification);
    results.push(id);
  }

  await batch.commit();
  logger.info('Bulk notifications created', { count: notifications.length });

  return results;
}
