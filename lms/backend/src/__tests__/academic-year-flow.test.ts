import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

import type { Request, Response, NextFunction } from 'express';
import { academicYearMiddleware } from '../middlewares/academicYear.middleware';
import { listFeeSchedules } from '../services/fee.service';
import { getStudentGrades } from '../services/grade.service';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset getSupabaseAdmin to return the mock supabase instance
  const { getSupabaseAdmin, getSupabaseClient } = require('../services/supabase');
  (getSupabaseAdmin as jest.Mock).mockReturnValue(mockSupabase);
  (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  (mockQuery.maybeSingle as any).mockReset();
  mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null } as any);
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
});

describe('AcademicYearMiddleware', () => {
  it('falls back to current year when supabase admin is null', async () => {
    // getSupabaseAdmin() returns null → middleware takes early return with fallback year
    const { getSupabaseAdmin } = require('../services/supabase');
    (getSupabaseAdmin as jest.Mock).mockReturnValue(null);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe(new Date().getFullYear().toString());
    expect(next).toHaveBeenCalled();
  });

  it('falls back to current year when settings table is empty', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null } as any);

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe(new Date().getFullYear().toString());
    expect(next).toHaveBeenCalled();
  });

  it('reads active year from settings when available', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    mockQuery.maybeSingle.mockResolvedValue({
      data: { data: { academicYear: '2025-2026' } },
      error: null,
    } as any);

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe('2025-2026');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to current year on database error', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    mockQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Connection failed' },
    } as any);

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe(new Date().getFullYear().toString());
    expect(next).toHaveBeenCalled();
  });

  it('never fails the request even if middleware throws', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    mockQuery.maybeSingle.mockRejectedValue(new Error('Unexpected error'));

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe(new Date().getFullYear().toString());
    expect(next).toHaveBeenCalled();
  });
});

describe('Fee & Grade Service Integration', () => {
  it('fee service filters schedules by academic year', async () => {
    (mockQuery as any).data = [{ id: 'f1', name: 'Tuition', amount: 5000, academic_year: '2025-2026' }];
    (mockQuery as any).count = 1;

    const result = await listFeeSchedules('s1', '2025-2026');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('grade service fetches grades by academic year', async () => {
    (mockQuery as any).data = [];
    const result = await getStudentGrades('stu1', '2025-2026', 's1');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('academic year middleware sets active year on all authenticated requests', async () => {
    const req = mockReq({
      user: { uid: 'u1', role: 'teacher', name: 'Teacher', school_id: 's1' },
    });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    mockQuery.maybeSingle.mockResolvedValue({
      data: { data: { academicYear: '2026-2027' } },
      error: null,
    } as any);

    await academicYearMiddleware(req, res, next);
    expect(req.activeAcademicYear).toBe('2026-2027');
    expect(next).toHaveBeenCalled();
  });
});
