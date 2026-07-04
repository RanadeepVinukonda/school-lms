import { jest } from '@jest/globals';

/**
 * Creates a self-healing Supabase query chain mock.
 *
 * All chainable methods return a thenable chain proxy that:
 * - Can be further chained (.eq().eq().maybeSingle())
 * - Can be awaited directly (.select().eq()) → resolves to { data: [], error: null, count: 0 }
 *
 * Terminal methods (single, maybeSingle) resolve by default to { data: null, error: null }.
 * range resolves to { data: [], error: null, count: 0 }.
 *
 * IMPORTANT: After jest.clearAllMocks() the mock implementations are cleared.
 * Call resetMockQuery(query) in your beforeEach to restore chain behaviour.
 */

const CHAINABLE_METHODS = [
  'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not', 'is',
  'order', 'limit', 'offset', 'contains', 'filter', 'count',
  'textSearch', 'or', 'overlaps', 'insert', 'update', 'upsert', 'delete',
  'range',
] as const;

export interface MockQueryChain {
  select: jest.Mock<any>;
  eq: jest.Mock<any>;
  neq: jest.Mock<any>;
  gt: jest.Mock<any>;
  gte: jest.Mock<any>;
  lt: jest.Mock<any>;
  lte: jest.Mock<any>;
  in: jest.Mock<any>;
  not: jest.Mock<any>;
  is: jest.Mock<any>;
  order: jest.Mock<any>;
  limit: jest.Mock<any>;
  range: jest.Mock<any>;
  offset: jest.Mock<any>;
  single: jest.Mock<any>;
  maybeSingle: jest.Mock<any>;
  insert: jest.Mock<any>;
  update: jest.Mock<any>;
  upsert: jest.Mock<any>;
  delete: jest.Mock<any>;
  contains: jest.Mock<any>;
  filter: jest.Mock<any>;
  count: jest.Mock<any>;
  textSearch: jest.Mock<any>;
  or: jest.Mock<any>;
  overlaps: jest.Mock<any>;
}

/**
 * Reset a MockQueryChain to its default state.
 * Safe to call after jest.clearAllMocks() — handles both
 * original jest.Mock methods and any that were clobbered with plain values.
 */
export function resetMockQuery(q: MockQueryChain): void {
  for (const m of CHAINABLE_METHODS) {
    const val = (q as any)[m];
    if (val && typeof val === 'function' && typeof val.mockReturnThis === 'function') {
      val.mockReturnThis();
    }
  }
  // Terminals
  if (typeof (q as any).single?.mockResolvedValue === 'function')
    q.single.mockResolvedValue({ data: null, error: null });
  if (typeof (q as any).maybeSingle?.mockResolvedValue === 'function')
    q.maybeSingle.mockResolvedValue({ data: null, error: null });
  // range is chainable — its resolution comes from then() / test-set data
}

export function createMockQuery(): MockQueryChain {
  const q: any = {};

  for (const m of CHAINABLE_METHODS) {
    q[m] = jest.fn().mockReturnThis();
  }

  // Terminals
  q.single = jest.fn<any>().mockResolvedValue({ data: null, error: null } as any);
  q.maybeSingle = jest.fn<any>().mockResolvedValue({ data: null, error: null } as any);
  // range is chainable (returns this) so await range() triggers then()
  // Tests can set .data/.count or ._mockData/._mockCount on the query to control resolution

  // Make chain thenable so `await chain` resolves properly
  // Supports both .data/count (set by existing tests) and _mockData/_mockCount
  q.then = function(this: any, resolve: Function) {
    const mockData = this.data !== undefined ? this.data :
                     this._mockData !== undefined ? this._mockData : [];
    const mockCount = this.count !== undefined ? this.count :
                      this._mockCount !== undefined ? this._mockCount :
                      Array.isArray(mockData) ? mockData.length : 0;
    return resolve({ data: mockData, error: null, count: mockCount });
  };

  return q;
}

export function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const query = createMockQuery();
  const mock = {
    from: jest.fn<any>().mockReturnValue(query),
    auth: {
      getUser: jest.fn<any>().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn<any>(),
      signUp: jest.fn<any>(),
      signOut: jest.fn<any>(),
    },
    rpc: jest.fn<any>().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn<any>().mockReturnValue({
        upload: jest.fn<any>().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn<any>().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
        remove: jest.fn<any>().mockResolvedValue({ data: {}, error: null }),
      }),
    },
    ...overrides,
  };
  return { supabase: mock, query };
}

export function createMockLogger() {
  return {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  };
}
