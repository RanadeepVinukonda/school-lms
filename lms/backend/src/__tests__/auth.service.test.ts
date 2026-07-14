import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';

let _mockSupabase: any;
jest.mock('../services/supabase', () => {
  const { createMockSupabase: cms } = require('./helpers/mock-factory');
  _mockSupabase = cms();
  return {
    getSupabaseAdmin: jest.fn(() => _mockSupabase.supabase),
    getSupabaseClient: jest.fn(() => _mockSupabase.supabase),
  };
});

jest.mock('../database/auth', () => ({
  createUser: jest.fn(async (data: any) => ({ uid: `uid-${data.email}`, email: data.email })),
  getUserByEmail: jest.fn(async (email: string) => email === 'exists@test.com' ? { uid: 'existing', email, role: 'teacher' } : null),
  getUserById: jest.fn(async (uid: string) => uid === 'user-1' ? { uid, email: 'test@test.com' } : null),
  updateUser: jest.fn(async () => {}),
  setCustomClaims: jest.fn(async () => {}),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../config/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({}),
    },
  })),
}));

import { register, login, forgotPassword, resetPassword, changePassword, refreshToken, getUserProfile, updateUserProfile, verifyUserToken } from '../services/auth.service';
import { getSupabaseAdmin } from '../services/supabase';

function mockFetch(data: any, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  });
}

describe('auth.service', () => {
  beforeEach(() => {
    const created = createMockSupabase();
    _mockSupabase = created;
    (getSupabaseAdmin as jest.Mock).mockImplementation(() => _mockSupabase.supabase);
  });

  describe('register', () => {
    it('returns failure for weak password', async () => {
      const r = await register({ email: 'a@b.com', password: 'weak', displayName: 'A', role: 'student' });
      expect(r.success).toBe(false);
    });

    it('registers a new user', async () => {
      const fetch = jest.requireMock('@supabase/supabase-js');
      (_mockSupabase.supabase.from('users').insert as jest.Mock).mockResolvedValue({ error: null } as any);

      const r = await register({ email: 'new@test.com', password: 'Strong1!pass', displayName: 'New', role: 'student' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.email).toBe('new@test.com');
        expect(r.data.role).toBe('student');
      }
    });

    it('returns CONFLICT when user exists', async () => {
      const r = await register({ email: 'exists@test.com', password: 'Strong1!x', displayName: 'X', role: 'student' });
      expect(r.success).toBe(false);
    });
  });

  describe('login', () => {
    it('returns user on valid credentials', async () => {
      global.fetch = mockFetch({
        user: { id: 'user-1' },
        access_token: 'token-123',
        refresh_token: 'refresh-123',
      }) as any;

      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'user-1') as any).maybeSingle.mockResolvedValue({
        data: { id: 'user-1', email: 'a@b.com', display_name: 'A', role: 'student', is_active: true },
        error: null,
      } as any);

      const r = await login('a@b.com', 'Strong1!x');
      expect(r.success).toBe(true);
    });

    it('returns failure when user disabled', async () => {
      global.fetch = mockFetch({
        user: { id: 'user-2' },
        access_token: 'tok',
      }) as any;

      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'user-2') as any).maybeSingle.mockResolvedValue({
        data: { id: 'user-2', email: 'b@c.com', is_active: false },
        error: null,
      } as any);

      const r = await login('b@c.com', 'Strong1!x');
      expect(r.success).toBe(false);
    });
  });

  describe('forgotPassword', () => {
    it('sends reset email', async () => {
      global.fetch = mockFetch({}, true) as any;
      const r = await forgotPassword('test@test.com');
      expect(r.message).toContain('reset link');
    });
  });

  describe('resetPassword', () => {
    it('resets via admin API', async () => {
      global.fetch = mockFetch({}, true) as any;
      await expect(resetPassword('uid-1', 'NewStrong1!x')).resolves.not.toThrow();
    });

    it('throws on weak password', async () => {
      await expect(resetPassword('uid-1', 'weak')).rejects.toThrow(ValidationError);
    });
  });

  describe('changePassword', () => {
    it('changes password', async () => {
      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'uid-1') as any).maybeSingle.mockResolvedValue({
        data: { id: 'uid-1', email: 'a@b.com', display_name: 'U', role: 'student', is_active: true },
        error: null,
      } as any);

      await expect(changePassword('uid-1', 'OldPass1!', 'NewPass1!')).resolves.not.toThrow();
    });

    it('throws when user not found', async () => {
      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'missing') as any).maybeSingle.mockResolvedValue({
        data: null, error: null,
      } as any);

      await expect(changePassword('missing', 'X', 'Strong1!x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('refreshToken', () => {
    it('returns new tokens', async () => {
      global.fetch = mockFetch({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        user: { id: 'uid-1' },
      }, true) as any;

      const r = await refreshToken('old-refresh');
      expect(r.token).toBe('new-token');
      expect(r.uid).toBe('uid-1');
    });
  });

  describe('getUserProfile', () => {
    it('returns profile', async () => {
      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'uid-1') as any).maybeSingle.mockResolvedValue({
        data: { id: 'uid-1', email: 'a@b.com', display_name: 'A', role: 'teacher', is_active: true },
        error: null,
      } as any);

      const r = await getUserProfile('uid-1');
      expect(r.success).toBe(true);
    });
  });

  describe('verifyUserToken', () => {
    it('returns user profile', async () => {
      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'user-1') as any).maybeSingle.mockResolvedValue({
        data: { id: 'user-1', email: 'a@b.com', display_name: 'A', role: 'admin', is_active: true },
        error: null,
      } as any);

      const r = await verifyUserToken('user-1');
      expect(r.email).toBe('a@b.com');
    });

    it('throws on unknown user', async () => {
      await expect(verifyUserToken('nobody')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('updateUserProfile', () => {
    it('updates profile fields', async () => {
      const supabase = _mockSupabase.supabase;
      (supabase.from('users').select('*').eq('id', 'uid-1') as any).maybeSingle
        .mockResolvedValue({ data: { id: 'uid-1' }, error: null } as any);
      (supabase.from('users').select('*').eq('id', 'uid-1') as any).single
        .mockResolvedValue({ data: { id: 'uid-1', email: 'a@b.com', display_name: 'NewName' }, error: null } as any);
      const r = await updateUserProfile('uid-1', { displayName: 'NewName' });
      expect(r.success).toBe(true);
    });
  });
});
