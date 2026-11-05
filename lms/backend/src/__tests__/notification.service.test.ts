import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

import { createNotification, getNotificationsByUser, markNotificationRead, markAllNotificationsRead, getUnreadCount, deleteNotification, getNotificationPreferences, updateNotificationPreferences, createBulkNotifications, sendNotificationToTargets } from '../services/notification.service';

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

describe('notification.service — category prefs & send API', () => {
  it('skips creation when category in-app preference is disabled', async () => {
    mockQuery.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null } as any)
      .mockResolvedValueOnce(({ data: { notification_preferences: { email: true, push: true, sms: false, inApp: true, in_app_enabled: true }, id: 'u1' }, error: null }) as any)
      .mockResolvedValueOnce(({ data: { in_app_enabled: false }, error: null }) as any);

    const result = await createNotification({ userId: 'u1', type: 'notice', title: 'T', body: 'B' });
    expect(result).toBeNull();
    expect(mockQuery.insert).not.toHaveBeenCalled();
  });

  it('creates when category in-app preference is enabled', async () => {
    mockQuery.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null } as any)
      .mockResolvedValueOnce(({ data: { notification_preferences: { email: true, push: true, sms: false, inApp: true, in_app_enabled: true }, id: 'u1' }, error: null }) as any)
      .mockResolvedValueOnce(({ data: { in_app_enabled: true }, error: null }) as any);

    const result = await createNotification({ userId: 'u1', type: 'notice', title: 'T', body: 'B' });
    expect(result).not.toBeNull();
    expect(mockQuery.insert).toHaveBeenCalled();
  });

  it('persists data and link columns', async () => {
    mockQuery.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null } as any)
      .mockResolvedValueOnce(({ data: { notification_preferences: { inApp: true, in_app_enabled: true }, id: 'u1' }, error: null }) as any)
      .mockResolvedValueOnce(({ data: null, error: null }) as any);

    await createNotification({ userId: 'u1', type: 'notice', title: 'T', body: 'B', data: { entityId: 'e1' }, link: '/notices/1' });
    const insertCall = (mockQuery.insert as any).mock.calls[0]?.[0];
    expect(insertCall.data).toEqual({ entityId: 'e1' });
    expect(insertCall.link).toBe('/notices/1');
  });

  it('resolves role targets and returns created ids', async () => {
    (mockQuery as any).data = [{ id: 'u1' }, { id: 'u2' }];
    const result = await sendNotificationToTargets({ type: 'notice', title: 'Hi', body: 'B', role: 'student' });
    expect(result.count).toBe(2);
    expect(result.notificationIds).toHaveLength(2);
  });

  it('returns empty when role has no users', async () => {
    (mockQuery as any).data = [];
    const result = await sendNotificationToTargets({ type: 'notice', title: 'Hi', body: 'B', role: 'teacher' });
    expect(result.count).toBe(0);
  });

  it('throws ValidationError when no target specified', async () => {
    await expect(sendNotificationToTargets({ type: 'notice', title: 'T', body: 'B' })).rejects.toThrow(ValidationError);
  });
});
