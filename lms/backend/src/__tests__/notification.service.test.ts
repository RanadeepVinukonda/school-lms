import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';

const notifData: any = {};
const userPrefData: any = {};
function makeDoc(ref: any) {
  return {
    exists: true, id: 'n1',
    data: () => ref.current,
    get: () => Promise.resolve({ exists: true, data: () => ref.current, id: 'n1' }),
    set: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    update: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    delete: () => Promise.resolve(),
  };
}
const theDoc = makeDoc(notifData);
const userPrefDoc = makeDoc(userPrefData);
function chainable(docs: any[] = [theDoc]) {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c, offset: () => c,
    count: () => ({ get: () => Promise.resolve({ data: () => ({ count: 5 }) }) }),
    get: () => Promise.resolve({ empty: false, docs, size: docs.length, forEach: (cb: any) => docs.forEach(cb) }),
  };
  return c;
}
const notifCollection: any = {
  doc: () => theDoc,
  get: () => Promise.resolve({ empty: false, docs: [theDoc], size: 1, forEach: (cb: Function) => cb(theDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
  firestore: { batch: () => ({ update: () => {}, set: () => {}, commit: () => Promise.resolve() }) },
};
const userCollection: any = {
  doc: () => userPrefDoc,
  get: () => Promise.resolve({ exists: true, data: () => userPrefData.current, id: 'u1' }),
};

jest.mock('../database/adapter', () => ({ collections: { notifications: jest.fn(), users: jest.fn() } }));
import { createNotification, getNotificationsByUser, markNotificationRead, markAllNotificationsRead, getUnreadCount, deleteNotification, getNotificationPreferences, updateNotificationPreferences, createBulkNotifications } from '../services/notification.service';
import { collections } from '../database/adapter';

beforeEach(() => {
  (collections.notifications as jest.Mock).mockReturnValue(notifCollection);
  (collections.users as jest.Mock).mockReturnValue(userCollection);
  notifData.current = {};
  userPrefData.current = { notificationPreferences: { email: true, push: true, sms: false, inApp: true } };
});

describe('notification.service', () => {
  it('creates and returns notification', async () => {
    const result = await createNotification({ userId: 'u1', type: 'info', title: 'Test', body: 'Hello' });
    expect(result.title).toBe('Test');
    expect(result.read).toBe(false);
  });
  it('returns paginated notifications', async () => {
    const result = await getNotificationsByUser('u1', { page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBe(5);
  });
  it('marks notification as read', async () => {
    notifData.current = { userId: 'u1' };
    await expect(markNotificationRead('n1', 'u1')).resolves.not.toThrow();
  });
  it('throws NotFoundError when not owner', async () => {
    notifData.current = { userId: 'other' };
    await expect(markNotificationRead('n1', 'u1')).rejects.toThrow(NotFoundError);
  });
  it('returns unread count', async () => {
    const result = await getUnreadCount('u1');
    expect(result.count).toBe(5);
  });
  it('deletes owned notification', async () => {
    notifData.current = { userId: 'u1' };
    await expect(deleteNotification('n1', 'u1')).resolves.not.toThrow();
  });
  it('returns user preferences', async () => {
    const prefs = await getNotificationPreferences('u1');
    expect(prefs.email).toBe(true);
  });
  it('updates preferences', async () => {
    const result = await updateNotificationPreferences('u1', { email: false, push: true, sms: true, inApp: false });
    expect(result.email).toBe(false);
  });
  it('creates multiple notifications', async () => {
    const result = await createBulkNotifications([{ userId: 'u1', type: 'info', title: 'Bulk', body: 'Test' }]);
    expect(result).toHaveLength(1);
  });
  it('marks all notifications read', async () => {
    await expect(markAllNotificationsRead('u1')).resolves.not.toThrow();
  });
});
