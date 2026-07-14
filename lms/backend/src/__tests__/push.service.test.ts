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

import { sendPush, sendPushBulk } from '../services/push.service';

describe('push.service', () => {
  let fetchSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
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
    expect(JSON.parse(options.body).to).toBe('ExponentPushToken[xxx]');
  });

  it('cleans up stale token on DeviceNotRegistered error', async () => {
    mockQuery.single.mockResolvedValue({ data: { push_enabled: true }, error: null } as any);
    (mockQuery as any).data = [{ token: 'ExponentPushToken[stale]', platform: 'ios' }];

    fetchSpy.mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ data: { status: 'error', message: 'DeviceNotRegistered' } }),
      } as any);
    });

    await sendPush('u1', 'info', 'Hello', 'World');
    expect(mockQuery.update).toHaveBeenCalled();
  });
});
