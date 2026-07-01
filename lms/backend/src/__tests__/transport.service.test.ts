import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = {
      insert: () => chain,
      select: () => chain,
      eq: () => chain,
      limit: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: { id: 'mock-id', name: 'Test Route' }, error: null }),
      update: () => chain,
      delete: () => chain,
      gte: () => chain,
      lte: () => chain,
    };
    return { from: jest.fn(() => chain) };
  }),
}));

import * as transportService from '../services/transport.service';

describe('Transport Service', () => {
  it('should create a route', async () => {
    const res = await transportService.createRoute('school-1', { name: 'Route 1' });
    expect(res).toBeDefined();
    expect(res!.name).toBe('Test Route');
  });

  it('should get routes', async () => {
    const res = await transportService.getRoutes('school-1');
    expect(res).toBeDefined();
  });
});
