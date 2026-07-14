process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Prevent real pg Pool connections in tests
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(() => Promise.resolve({ rows: [] })),
    release: jest.fn(),
  };
  const mockPool = {
    query: jest.fn(() => Promise.resolve({ rows: [] })),
    connect: jest.fn(() => Promise.resolve(mockClient)),
    end: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock TransactionManager to avoid pg pool in tests
jest.mock('../database/transaction-manager', () => ({
  TransactionManager: jest.fn().mockImplementation(() => ({
    runTransaction: jest.fn(async (fn: Function) => {
      const mockTx = {
        get: jest.fn(() => Promise.resolve(null)),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      };
      return fn(mockTx);
    }),
  })),
  PseudoTx: jest.fn().mockImplementation(() => ({
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    commit: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock Inngest serve to prevent real InngestCommHandler init (hangs in tests)
jest.mock('inngest/express', () => ({
  serve: () => (_req: any, _res: any, next: any) => next(),
}));

// Placeholder test so Jest doesn't complain about empty suite
// This file's main purpose is setup (setupFilesAfterEnv), not testing
describe('setup', () => {
  it('loads environment and mocks', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

