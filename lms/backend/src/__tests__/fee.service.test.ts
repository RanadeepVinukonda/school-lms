import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';
import { ValidationError } from '../utils/errors';

let _mock: any;
jest.mock('../services/supabase', () => {
  const { createMockSupabase: cms } = require('./helpers/mock-factory');
  _mock = cms();
  return {
    getSupabaseAdmin: jest.fn(() => _mock.supabase),
    getSupabaseClient: jest.fn(() => _mock.supabase),
  };
});

let _mockDbClient: { query: jest.Mock; release: jest.Mock };
jest.mock('../database/connection-manager', () => {
  const mockClient = {
    query: jest.fn<any>(),
    release: jest.fn(),
  };
  _mockDbClient = mockClient;
  const mockPool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    end: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
  };
  return {
    getConnectionPool: jest.fn(() => mockPool),
    healthCheck: jest.fn(() => Promise.resolve(true)),
    closeConnectionPool: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { recordPayment, getOutstandingReport, createFeeSchedule, listFeeSchedules, getStudentPayments } from '../services/fee.service';

function mockPoolClient() {
  return _mockDbClient;
}

describe('fee.service', () => {
  let _q: any;
  beforeEach(() => {
    const created = createMockSupabase();
    _mock = created;
    _q = created.query;
    _mockDbClient.query = jest.fn<any>().mockResolvedValue({ rows: [] });
    _mockDbClient.release = jest.fn();
  });

  describe('recordPayment', () => {
    it('records payment when balance sufficient', async () => {
      const client = await mockPoolClient();
      client.query
        .mockResolvedValueOnce({ rows: [] })                      // BEGIN
        .mockResolvedValueOnce({ rows: [{ amount: '1000' }] })    // schedule amount
        .mockResolvedValueOnce({ rows: [{ total_paid: '400' }] }) // existing payments
        .mockResolvedValueOnce({ rows: [{ id: 'pay-1', student_id: 's1', amount: '600' }] }); // INSERT
      // COMMIT and ROLLBACK fall through to default { rows: [] }

      const r = await recordPayment({ studentId: 's1', feeScheduleId: 'fs-1', amountPaid: 600 });
      expect(r.student_id).toBe('s1');
      expect(r.amount).toBe('600');
    });

    it('rejects overpayment', async () => {
      const client = await mockPoolClient();
      client.query
        .mockResolvedValueOnce({ rows: [] })                      // BEGIN
        .mockResolvedValueOnce({ rows: [{ amount: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ total_paid: '500' }] });
      // ROLLBACK falls through to default { rows: [] }

      await expect(recordPayment({ studentId: 's1', feeScheduleId: 'fs-1', amountPaid: 600 }))
        .rejects.toThrow(ValidationError);
    });

    it('throws on missing schedule', async () => {
      const client = await mockPoolClient();
      client.query
        .mockResolvedValueOnce({ rows: [] })                      // BEGIN
        .mockResolvedValueOnce({ rows: [] });                     // SELECT amount

      await expect(recordPayment({ studentId: 's1', feeScheduleId: 'missing', amountPaid: 100 }))
        .rejects.toThrow('Fee schedule not found');
    });
  });

  describe('getOutstandingReport', () => {
    it('returns report with balances', async () => {
      const supabase = jest.requireMock('../services/supabase').getSupabaseAdmin();
      supabase.from = jest.fn().mockReturnThis();
      supabase.select = jest.fn().mockReturnThis();
      supabase.eq = jest.fn().mockReturnThis();
      supabase.is = jest.fn().mockReturnThis();
      supabase.in = jest.fn().mockReturnThis();
      supabase.then = jest.fn(function (resolve: Function) {
        if (this._qIndex === undefined) this._qIndex = 0;
        const i = this._qIndex++;
        const datasets = [
          { data: [{ id: 'fs-1', name: 'Tuition', amount: '1000', class_id: 'c1' }], error: null }, // structures
          { data: [{ id: 'p-1', student_id: 's1', amount: '600' }], error: null }, // payments
          { data: [{ id: 's1', display_name: 'Alice', class_id: 'c1' }], error: null }, // students
        ];
        return resolve(datasets[i] || { data: [], error: null });
      });

      const r = await getOutstandingReport('school-1');
      expect(r).toHaveLength(1);
      expect(r[0].studentName).toBe('Alice');
      expect(r[0].balance).toBe(400);
    });
  });

  describe('createFeeSchedule', () => {
    it('creates schedule', async () => {
      const supabase = jest.requireMock('../services/supabase').getSupabaseAdmin();
      (supabase.from('fee_structures').insert({}).select().single as any).mockResolvedValue({
        data: { id: 'fs-1', name: 'Tuition', amount: 500 },
        error: null,
      });

      const r = await createFeeSchedule({ name: 'Tuition', amount: 500, classId: 'c1', schoolId: 's1' });
      expect(r.name).toBe('Tuition');
    });
  });

  describe('listFeeSchedules', () => {
    it('lists with school filter', async () => {
      const supabase = jest.requireMock('../services/supabase').getSupabaseAdmin();
      const query = supabase.from('fee_structures').select('*');
      query.eq = jest.fn().mockReturnThis();
      (query as any).then = jest.fn((resolve: Function) => resolve({ data: [{ id: 'fs-1' }], error: null }));

      const r = await listFeeSchedules('school-1');
      expect(r).toHaveLength(1);
    });
  });
});
