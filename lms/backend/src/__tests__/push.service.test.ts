import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

// Mock env
jest.mock('../config/env', () => ({
  env: {
    EXPO_ACCESS_TOKEN: 'test-token',
  },
}));

import { sendPush, sendPushBulk, buildFCMMessage } from '../services/push.service';

describe('push.service', () => {
  let fetchSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.is.mockReturnThis();
    mockQuery.update.mockReturnThis();
    delete (mockQuery as any).data;
    
    // Stub fetch
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ data: { status: 'ok' } }),
      } as any);
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('does not send if EXPO_ACCESS_TOKEN is missing', async () => {
    const { env } = require('../config/env');
    const originalToken = env.EXPO_ACCESS_TOKEN;
    env.EXPO_ACCESS_TOKEN = undefined;

    await sendPush('u1', 'info', 'Hello', 'World');
    expect(fetchSpy).not.toHaveBeenCalled();

    env.EXPO_ACCESS_TOKEN = originalToken;
  });

  it('sends push to registered device tokens', async () => {
    // Mock preference check
    mockQuery.single.mockResolvedValue({ data: { push_enabled: true }, error: null } as any);
    
    // Mock tokens list
    (mockQuery as any).data = [{ token: 'ExponentPushToken[xxx]', platform: 'android' }];

    await sendPush('u1', 'info', 'Hello', 'World', { key: 'val' });
    expect(fetchSpy).toHaveBeenCalled();
    const [url, options]: [any, any] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    const batch = JSON.parse(options.body);
    expect(Array.isArray(batch)).toBe(true);
    expect(batch[0].to).toBe('ExponentPushToken[xxx]');
  });

  it('cleans up stale token on DeviceNotRegistered error', async () => {
    mockQuery.single.mockResolvedValue({ data: { push_enabled: true }, error: null } as any);
    (mockQuery as any).data = [{ token: 'ExponentPushToken[stale]', platform: 'ios' }];

    fetchSpy.mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ data: [{ status: 'error', message: 'DeviceNotRegistered' }] }),
      } as any);
    });

    await sendPush('u1', 'info', 'Hello', 'World');
    expect(mockQuery.update).toHaveBeenCalled();
  });

  it('respects per-category push preference (disabled)', async () => {
    mockQuery.maybeSingle.mockResolvedValue({ data: { push_enabled: false }, error: null } as any);
    (mockQuery as any).data = [{ token: 'ExponentPushToken[xxx]', platform: 'android' }];

    await sendPush('u1', 'info', 'Hello', 'World');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not respect category pref when no row exists', async () => {
    mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null } as any);
    (mockQuery as any).data = [{ token: 'ExponentPushToken[xxx]', platform: 'android' }];

    await sendPush('u1', 'info', 'Hello', 'World');
    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe('buildFCMMessage', () => {
  it('builds a high-priority message with mapped channel', () => {
    const msg = buildFCMMessage(['tok'], 'Title', 'Body', { type: 'assignment' }, 'assignment');
    expect(msg.tokens).toEqual(['tok']);
    expect((msg as any).android.priority).toBe('high');
    expect((msg as any).android.notification.channelId).toBe('assignments');
    expect((msg as any).android.notification.icon).toBe('ic_stat_genesis');
    expect((msg as any).android.notification.sound).toBe('default');
  });

  it('stringifies data and includes type/category', () => {
    const msg = buildFCMMessage(['tok'], 'T', 'B', { key: { nested: 1 }, entityId: 'a1' }, 'quiz');
    expect(msg.data.key).toBe('{"nested":1}');
    expect(msg.data.entityId).toBe('a1');
    expect(msg.data.type).toBe('quiz');
    expect(msg.data.category).toBe('quizzes');
  });

  it('adds collapse key and tag when entityId present', () => {
    const withId = buildFCMMessage(['tok'], 'T', 'B', { entityId: 'a1' }, 'assignment');
    expect((withId as any).android.collapseKey).toBe('g:assignments:a1');
    expect((withId as any).android.notification.tag).toBe('g:assignments:a1');

    const withoutId = buildFCMMessage(['tok'], 'T', 'B', {}, 'assignment');
    expect((withoutId as any).android.collapseKey).toBeUndefined();
  });
});
