import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

const mockVerifyToken = jest.fn<any>();
jest.mock('../firebase/auth', () => ({
  verifyToken: mockVerifyToken,
}));

const mockGetDoc = jest.fn<any>();
const mockDoc = jest.fn<any>().mockReturnValue({ get: mockGetDoc });
const mockFirestore = {
  doc: mockDoc,
};
jest.mock('../firebase/admin', () => ({
  getAdminFirestore: () => mockFirestore,
}));

jest.mock('../utils/errors', () => ({
  UnauthorizedError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'UnauthorizedError';
    }
  },
}));

import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('authenticate', () => {
  let next: jest.Mock<any>;

  beforeEach(() => {
    next = jest.fn<any>();
    mockVerifyToken.mockReset();
    mockGetDoc.mockReset();
  });

  it('throws if no token provided', async () => {
    await authenticate(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('throws if token is empty', async () => {
    await authenticate(mockReq('Bearer '), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('throws if token has no role', async () => {
    mockVerifyToken.mockResolvedValue({ uid: 'u1', email: 'test@test.com' });
    mockGetDoc.mockResolvedValue({ exists: false });
    await authenticate(mockReq('Bearer valid-token'), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'UnauthorizedError' }));
  });

  it('sets req.user on valid token', async () => {
    mockVerifyToken.mockResolvedValue({ uid: 'u1', email: 'test@test.com', role: 'teacher' });
    const req = mockReq('Bearer valid-token');
    await authenticate(req, mockRes(), next);
    expect((req as any).user).toBeDefined();
    expect((req as any).user.uid).toBe('u1');
    expect((req as any).user.role).toBe('teacher');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('optionalAuth', () => {
  let next: jest.Mock<any>;

  beforeEach(() => {
    next = jest.fn<any>();
    mockVerifyToken.mockReset();
    mockGetDoc.mockReset();
  });

  it('does nothing if no auth header', async () => {
    optionalAuth(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('does nothing if token verification fails', async () => {
    mockVerifyToken.mockRejectedValue(new Error('invalid'));
    optionalAuth(mockReq('Bearer bad-token'), mockRes(), next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith();
  });
});
