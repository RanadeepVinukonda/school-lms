import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = {
      insert: () => chain,
      select: () => chain,
      eq: () => chain,
      limit: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: { id: 'mock-id', name: 'Test Item' }, error: null }),
      update: () => chain,
      delete: () => chain,
    };
    return { from: jest.fn(() => chain) };
  }),
}));

import * as inventoryService from '../services/inventory.service';

describe('Inventory Service', () => {
  it('should create an item', async () => {
    const res = await inventoryService.createItem('school-1', { name: 'Item 1', quantity: 10 });
    expect(res).toBeDefined();
    expect(res!.name).toBe('Test Item');
  });

  it('should get items', async () => {
    const res = await inventoryService.getItems('school-1');
    expect(res).toBeDefined();
  });
});
