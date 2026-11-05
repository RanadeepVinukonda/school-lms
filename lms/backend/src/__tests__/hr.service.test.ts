import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = {
      insert: () => chain,
      select: () => chain,
      eq: () => chain,
      limit: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: { id: 'mock-id', name: 'Test Staff', base_salary: 50000 }, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      update: () => chain,
      delete: () => chain,
      gte: () => chain,
      lte: () => chain,
    };
    return { from: jest.fn(() => chain) };
  }),
}));

import * as staffService from '../services/staff.service';
import * as leaveService from '../services/leave.service';
import * as payrollService from '../services/payroll.service';

describe('HR Services', () => {
  it('should create staff record', async () => {
    const res = await staffService.createStaff('school-1', { name: 'Staff A', role: 'teacher' });
    expect(res).toBeDefined();
    expect(res!.name).toBe('Test Staff');
  });

  it('should request leave', async () => {
    const res = await leaveService.requestLeave('school-1', { staff_id: 'staff-1', start_date: '2026-07-01', end_date: '2026-07-02' });
    expect(res).toBeDefined();
  });

  it('should run payroll', async () => {
    const res = await payrollService.runPayroll('school-1', 'staff-1', '2026-07');
    expect(res).toBeDefined();
  });
});
