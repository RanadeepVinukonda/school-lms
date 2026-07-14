import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

let _mockSupabase: any;
jest.mock('../services/supabase', () => {
  const { createMockSupabase: cms } = require('./helpers/mock-factory');
  _mockSupabase = cms();
  return {
    getSupabaseAdmin: jest.fn(() => _mockSupabase.supabase),
    getSupabaseClient: jest.fn(() => _mockSupabase.supabase),
  };
});

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getSchool, getBranding, createSchool, updateSchool, updateBranding } from '../controllers/schools.controller';
import { getSupabaseClient, getSupabaseAdmin } from '../services/supabase';

function mockReq(overrides: Record<string, any> = {}) {
  return {
    params: {},
    body: {},
    user: { uid: 'user-1', school_id: 'school-1', role: 'student' },
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('schools.controller', () => {
  beforeEach(() => {
    const c = createMockSupabase();
    _mockSupabase = c;
  });

  describe('getSchool', () => {
    it('returns school when user owns it', async () => {
      const client = getSupabaseClient();
      (client.from('schools').select('*').eq('id', 'school-1') as any).maybeSingle.mockResolvedValue({
        data: { id: 'school-1', name: 'Test School', subdomain: 'test' },
        error: null,
      } as any);

      const req = mockReq({ params: { id: 'school-1' } });
      const res = mockRes();
      await getSchool(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Test School' }),
      }));
    });

    it('rejects when school_id does not match', async () => {
      const req = mockReq({ params: { id: 'other-school' }, user: { uid: 'u1', school_id: 'school-1' } });
      const res = mockRes();
      await expect(getSchool(req, res)).rejects.toThrow('Access denied');
    });

    it('throws not found for missing school', async () => {
      const supabase = jest.requireMock('../services/supabase');
      supabase.getSupabaseClient = jest.fn(() => {
        const { supabase: sb } = createMockSupabase();
        (sb.from('schools').select('*').eq('id', 'school-1') as any).maybeSingle.mockResolvedValue({
          data: null, error: null,
        } as any);
        return sb;
      });

      const req = mockReq({ params: { id: 'school-1' } });
      const res = mockRes();
      await expect(getSchool(req, res)).rejects.toThrow('School not found');
    });
  });

  describe('getBranding', () => {
    it('returns branding for own school', async () => {
      const sb = createMockSupabase();
      (sb.supabase.from('schools').select('logo_url, primary_color, name').eq('id', 'school-1') as any).maybeSingle.mockResolvedValue({
        data: { logo_url: 'logo.png', primary_color: '#000', name: 'Test' },
        error: null,
      } as any);
      (getSupabaseClient as jest.Mock).mockReturnValue(sb.supabase);
      const req = mockReq({ params: { id: 'school-1' } });
      const res = mockRes();
      await getBranding(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('rejects cross-school access', async () => {
      const req = mockReq({ params: { id: 'other-school' }, user: { uid: 'u1', school_id: 'school-1' } });
      const res = mockRes();
      await expect(getBranding(req, res)).rejects.toThrow('Access denied');
    });
  });

  describe('createSchool', () => {
    it('creates school', async () => {
      const admin = getSupabaseAdmin();
      (admin.from('schools').insert({}).select('id').maybeSingle as any).mockResolvedValue({
        data: { id: 'new-school' },
        error: null,
      } as any);

      const req = mockReq({ body: { name: 'New', subdomain: 'new', plan: 'basic' } });
      const res = mockRes();
      await createSchool(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'New' }),
      }));
    });
  });

  describe('updateSchool', () => {
    it('updates existing school', async () => {
      const admin = getSupabaseAdmin();
      (admin.from('schools').select('id').eq('id', 'school-1').maybeSingle as any).mockResolvedValue({
        data: { id: 'school-1' }, error: null,
      } as any);

      const req = mockReq({ params: { id: 'school-1' }, body: { name: 'Updated' } });
      const res = mockRes();
      await updateSchool(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateBranding', () => {
    it('updates branding', async () => {
      const admin = getSupabaseAdmin();
      (admin.from('schools').select('id').eq('id', 'school-1').maybeSingle as any).mockResolvedValue({
        data: { id: 'school-1' }, error: null,
      } as any);

      const req = mockReq({ params: { id: 'school-1' }, body: { logo_url: 'logo.png', primary_color: '#000' } });
      const res = mockRes();
      await updateBranding(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
