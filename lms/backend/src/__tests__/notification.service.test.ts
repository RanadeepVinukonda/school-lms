import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

import { createNotification, getNotificationsByUser, markNotificationRead, markAllNotificationsRead, getUnreadCount, deleteNotification, getNotificationPreferences, updateNotificationPreferences, createBulkNotifications } from '../services/notification.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  mockQuery.insert.mockReturnThis();
  mockQuery.is.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  (mockQuery as any).data = undefined;
  (mockQuery as any).error = undefined;
  (mockQuery as any).count = undefined;
  // Default: user preferences exist with inApp enabled
  mockQuery.maybeSingle.mockResolvedValue(({ data: { notification_preferences: { email: true, push: true, sms: false, inApp: true, in_app_enabled: true }, id: 'u1' }, error: null }) as any);
  // Default: successful create
  mockQuery.single.mockResolvedValue(({ data: { id: 'n-new', title: 'Test', body: 'Hello', read: false, user_id: 'u1', type: 'info' }, error: null }) as any);
});

describe('notification.service', () => {
  it('creates and returns notification', async () => {
    const result = await createNotification({ userId: 'u1', type: 'info', title: 'Test', body: 'Hello' });
    if (!result) throw new Error('Expected notification, got null');
    expect(result.title).toBe('Test');
    expect(result.read).toBe(false);
  });
  it('returns paginated notifications', async () => {
    (mockQuery as any).data = [{ id: 'n1', user_id: 'u1', title: 'Test', body: 'Hello', read: false, created_at: new Date().toISOString() }];
    (mockQuery as any).count = 5;
    const result = await getNotificationsByUser('u1', { page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBe(5);
  });
  it('marks notification as read', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { id: 'n1', user_id: 'u1' }, error: null }) as any);
    await expect(markNotificationRead('n1', 'u1')).resolves.not.toThrow();
  });
  it('throws NotFoundError when not owner', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { id: 'n1', user_id: 'other' }, error: null }) as any);
    await expect(markNotificationRead('n1', 'u1')).rejects.toThrow(NotFoundError);
  });
  it('returns unread count', async () => {
    (mockQuery as any).count = 5;
    const result = await getUnreadCount('u1');
    expect(result.count).toBe(5);
  });
  it('deletes owned notification', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { id: 'n1', user_id: 'u1' }, error: null }) as any);
    await expect(deleteNotification('n1', 'u1')).resolves.not.toThrow();
  });
  it('returns user preferences', async () => {
    const prefs = await getNotificationPreferences('u1');
    expect(prefs.email).toBe(true);
  });
  it('updates preferences', async () => {
    mockQuery.maybeSingle
      .mockReset()
      .mockResolvedValue(({ data: { id: 'u1' }, error: null }) as any);
    const result = await updateNotificationPreferences('u1', { email: false, push: true, sms: true, in_app_enabled: false });
    expect(result.email).toBe(false);
  });
  it('creates multiple notifications', async () => {
    (mockQuery as any).data = [{ id: 'n-bulk-1' }];
    const result = await createBulkNotifications([{ userId: 'u1', type: 'info', title: 'Bulk', body: 'Test' }]);
    expect(result).toHaveLength(1);
  });
  it('marks all notifications read', async () => {
    (mockQuery as any).data = [{ id: 'n1' }, { id: 'n2' }];
    await expect(markAllNotificationsRead('u1')).resolves.not.toThrow();
  });
});
