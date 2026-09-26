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

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const createChain = (result: any = { data: [], error: null }) => {
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      neq: jest.fn(() => chain),
      gt: jest.fn(() => chain),
      gte: jest.fn(() => chain),
      lt: jest.fn(() => chain),
      lte: jest.fn(() => chain),
      in: jest.fn(() => chain),
      is: jest.fn(() => chain),
      not: jest.fn(() => chain),
      like: jest.fn(() => chain),
      ilike: jest.fn(() => chain),
      or: jest.fn(() => chain),
      and: jest.fn(() => chain),
      order: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      range: jest.fn(() => chain),
      single: jest.fn(() => Promise.resolve(result)),
      maybeSingle: jest.fn(() => Promise.resolve(result)),
      then: (onFulfilled: any) => Promise.resolve(result).then(onFulfilled),
      catch: (onRejected: any) => Promise.resolve(result).catch(onRejected),
      finally: (onFinally: any) => Promise.resolve(result).finally(onFinally),
    };
    return chain;
  };

  const mockSupabase = {
    from: jest.fn(() => createChain({ data: [], error: null })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      updateUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      admin: {
        getUserById: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        updateUserById: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        deleteUser: jest.fn(() => Promise.resolve({ error: null })),
      },
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
        download: jest.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  };

  return { createClient: jest.fn(() => mockSupabase) };
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

