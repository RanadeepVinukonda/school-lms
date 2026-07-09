import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BaseService, DbRecord } from '../lib/base-service';
import { NotFoundError } from '../utils/errors';

// ── Test Fixtures ───────────────────────────────────────────

interface TestRecord extends DbRecord {
  name: string;
  email?: string;
}

const mockInsert = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockSingle = jest.fn<any>();
const mockMaybeSingle = jest.fn<any>();
const mockEq = jest.fn<any>();
const mockIs = jest.fn<any>();
const mockOrder = jest.fn<any>();
const mockRange = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockOr = jest.fn<any>();

class TestService extends BaseService<TestRecord> {
  protected readonly table = 'test_records';
}

class SoftDeleteService extends BaseService<TestRecord> {
  protected readonly table = 'soft_records';
  protected softDelete = true;
}

class HookedService extends BaseService<TestRecord> {
  protected readonly table = 'hooked_records';

  protected async beforeCreate(dto: Partial<TestRecord>) {
    return { ...dto, enriched: true };
  }

  protected async afterFind(record: TestRecord) {
    return { ...record, transformed: true };
  }
}

function setupMockChain(overrides: Record<string, any> = {}) {
  const chain = {
    select: jest.fn(() => chain) as any,
    eq: jest.fn(() => chain) as any,
    is: jest.fn(() => chain) as any,
    order: jest.fn(() => chain) as any,
    range: jest.fn(() => chain) as any,
    or: jest.fn(() => chain) as any,
    single: jest.fn<any>(),
    maybeSingle: jest.fn<any>(),
    insert: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
    ...overrides,
  };

  chain.single = jest.fn<any>().mockResolvedValue({ data: { id: 'test-id', name: 'Test' }, error: null });
  chain.maybeSingle = jest.fn<any>().mockResolvedValue({ data: { id: 'test-id', name: 'Test' }, error: null });

  return chain as any;
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  describe('create', () => {
    it('should create a record and return it', async () => {
      const chain = setupMockChain();
      chain.single = jest.fn<any>().mockResolvedValue({ data: { id: 'new-id', name: 'New Record', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, error: null });

      // We need to mock the supabase client chain
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: chain.single,
            })),
          })),
        })),
      });

      const result = await service.create({ name: 'New Record' });
      expect(result).toBeDefined();
      expect((result as any).name).toBe('New Record');
    });

    it('should throw on error', async () => {
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn<any>().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
            })),
          })),
        })),
      });

      await expect(service.create({ name: 'Bad' })).rejects.toThrow('Insert failed');
    });
  });

  describe('findById', () => {
    it('should return a record when found', async () => {
      const record = { id: 'abc', name: 'Found' };
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn<any>().mockResolvedValue({ data: record, error: null }),
            })),
          })),
        })),
      });

      const result = await service.findById('abc');
      expect(result).toEqual(record);
    });

    it('should return null when not found', async () => {
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn<any>().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      });

      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return a record when found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue({ id: 'abc', name: 'Found' } as any);
      const result = await service.findByIdOrThrow('abc');
      expect(result).toEqual({ id: 'abc', name: 'Found' });
    });

    it('should throw NotFoundError when not found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.findByIdOrThrow('gone')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      jest.spyOn(service, 'findByIdOrThrow').mockResolvedValue({ id: 'abc', name: 'Old' } as any);
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn<any>().mockResolvedValue({ data: { id: 'abc', name: 'Updated' }, error: null }),
              })),
            })),
          })),
        })),
      });

      const result = await service.update('abc', { name: 'Updated' });
      expect(result).toBeDefined();
      expect((result as any).name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should hard-delete non-soft-delete records', async () => {
      jest.spyOn(service, 'findByIdOrThrow').mockResolvedValue({ id: 'abc', name: 'ToDelete' } as any);
      let deleted = false;
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => {
              deleted = true;
              return { error: null };
            }),
          })),
        })),
      });

      await service.delete('abc');
      expect(deleted).toBe(true);
    });
  });

  describe('soft delete', () => {
    it('should set deleted_at instead of hard-deleting', async () => {
      const sdService = new SoftDeleteService();
      jest.spyOn(sdService, 'findByIdOrThrow').mockResolvedValue({ id: 'abc', name: 'SoftDel' } as any);

      let updatedData: any = null;
      jest.spyOn(sdService as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn((data: any) => ({
            eq: jest.fn(() => {
              updatedData = data;
              return { error: null };
            }),
          })),
        })),
      });

      await sdService.delete('abc');
      expect(updatedData).toBeDefined();
      expect(updatedData.deleted_at).toBeDefined();
    });
  });

  describe('paginate', () => {
    it('should return paginated results', async () => {
      const items = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
      // Build chain: select -> (no is since softDelete=false) -> order -> range
      const mockRange = jest.fn<any>().mockResolvedValue({ data: items, error: null, count: 2 });
      const mockOrder = jest.fn(() => ({ range: mockRange }));
      jest.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: mockOrder,
          })),
        })),
      });

      const result = await service.paginate(1, 10);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('hooks', () => {
    it('should run beforeCreate hook', async () => {
      const hooked = new HookedService();
      jest.spyOn(hooked as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn<any>().mockResolvedValue({ data: { id: '1', name: 'Test', enriched: true }, error: null }),
            })),
          })),
        })),
      });

      const result = await hooked.create({ name: 'Test' });
      expect((result as any).enriched).toBe(true);
    });

    it('should run beforeUpdate hook', async () => {
      const hooked = new HookedService();
      jest.spyOn(hooked, 'findByIdOrThrow').mockResolvedValue({ id: '1', name: 'Old' } as any);
      jest.spyOn(hooked as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn<any>().mockResolvedValue({ data: { id: '1', name: 'Updated', enriched: true }, error: null }),
              })),
            })),
          })),
        })),
      });

      const result = await hooked.update('1', { name: 'Updated' });
      expect((result as any).enriched).toBe(true);
    });

    it('should run afterFind hook', async () => {
      const hooked = new HookedService();
      jest.spyOn(hooked as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn<any>().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null }),
            })),
          })),
        })),
      });

      const result = await hooked.findById('1');
      expect((result as any).transformed).toBe(true);
    });
  });

  describe('soft delete (findById filter)', () => {
    it('should filter out soft-deleted records in findById', async () => {
      const sdService = new SoftDeleteService();
      let appliedIsNullFilter = false;
      jest.spyOn(sdService as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              is: jest.fn((col: string, val: null) => {
                appliedIsNullFilter = col === 'deleted_at' && val === null;
                return {
                  maybeSingle: jest.fn<any>().mockResolvedValue({ data: null, error: null }),
                };
              }),
            })),
          })),
        })),
      });

      const result = await sdService.findById('soft-deleted-id');
      expect(result).toBeNull();
      expect(appliedIsNullFilter).toBe(true);
    });

    it('should throw NotFoundError when record not found by findByIdOrThrow', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.findByIdOrThrow('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deleting a non-existent record', async () => {
      const sdService = new SoftDeleteService();
      jest.spyOn(sdService, 'findById').mockResolvedValue(null);
      await expect(sdService.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
