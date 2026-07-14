import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

jest.mock('../utils/errors', () => ({
  UnauthorizedError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'UnauthorizedError';
    }
  },
}));

const mockQuery = {
  select: jest.fn<any>().mockReturnThis(),
  eq: jest.fn<any>().mockReturnThis(),
  single: jest.fn<any>(),
};
const mockSupabase = {
  auth: {
    getUser: jest.fn<any>(),
  },
  from: jest.fn<any>().mockReturnValue(mockQuery),
};
jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
}));

import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('authenticate', () => {
  let next: any;

  beforeEach(() => {
    next = jest.fn();
    mockSupabase.auth.getUser.mockReset();
    mockQuery.select.mockClear();
    mockQuery.eq.mockClear();
    mockQuery.single.mockReset();
  });

  it('throws if no token provided', async () => {
    authenticate(mockReq(), mockRes(), next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('throws if token is empty', async () => {
    authenticate(mockReq('Bearer '), mockRes(), next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('throws if token verification fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad') });
    authenticate(mockReq('Bearer bad-token'), mockRes(), next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('sets req.user on valid token', async () => {
    mockSupabase.auth.getUser.mockResolvedValue(({ data: { user: { id: 'u1', email: 'test@test.com' } }, error: null }) as any);
    mockQuery.single.mockResolvedValue(({ data: { role: 'teacher', display_name: 'Test', class_ids: ['c1'] }, error: null }) as any);
    const req = mockReq('Bearer valid-token');
    authenticate(req, mockRes(), next);
    await new Promise(process.nextTick);
    expect((req as any).user).toBeDefined();
    expect((req as any).user.uid).toBe('u1');
    expect((req as any).user.role).toBe('teacher');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('optionalAuth', () => {
  let next: any;

  beforeEach(() => {
    next = jest.fn();
    mockSupabase.auth.getUser.mockReset();
  });

  it('does nothing if no auth header', async () => {
    optionalAuth(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('does nothing if token verification fails', async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error('invalid'));
    optionalAuth(mockReq('Bearer bad-token'), mockRes(), next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith();
  });
});
