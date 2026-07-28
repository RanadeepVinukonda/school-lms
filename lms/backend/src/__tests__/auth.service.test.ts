import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';
import { NotFoundError } from '../utils/errors';

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
  getUserByPhone: jest.fn(async (phone: string) => phone === '+919999999999' ? { uid: 'existing-phone', phone, role: 'teacher' } : null),
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

import { register, refreshToken, getUserProfile, updateUserProfile, verifyUserToken } from '../services/auth.service';
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
    it('returns failure when phone already registered', async () => {
      const r = await register({ phone: '+919999999999', displayName: 'A', role: 'student' });
      expect(r.success).toBe(false);
    });

    it('registers a new user', async () => {
      const r = await register({ phone: '+918888888888', displayName: 'New', role: 'student' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.phoneNumber).toBe('+918888888888');
        expect(r.data.role).toBe('student');
      }
    });

    it('returns CONFLICT when user exists', async () => {
      const r = await register({ phone: '+919999999999', displayName: 'X', role: 'student' });
      expect(r.success).toBe(false);
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
      await expect(verifyUserToken('nobody')).rejects.toThrow(NotFoundError);
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
