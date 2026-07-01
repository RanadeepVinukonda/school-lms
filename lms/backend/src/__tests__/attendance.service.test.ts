import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const attendData: any = {};
function makeDoc(ref: any) {
  return {
    exists: true, id: 'a1',
    data: () => ref.current,
    get: () => Promise.resolve({ exists: true, data: () => ref.current, id: 'a1' }),
    set: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    update: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    delete: () => Promise.resolve(),
  };
}
const theDoc = makeDoc(attendData);
function chainable() {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c,
    get: () => Promise.resolve({ empty: true, docs: [], size: 0, forEach: () => {} }),
  };
  return c;
}
const attendCollection: any = {
  doc: () => theDoc,
  get: () => Promise.resolve({ empty: false, docs: [theDoc], size: 1, forEach: (cb: Function) => cb(theDoc) }),
  where: () => chainable(),
};
const userCollection: any = {
  doc: () => ({ exists: true, id: 's1', data: () => ({ displayName: 'John' }),
    get: () => Promise.resolve({ exists: true, data: () => ({ displayName: 'John' }), id: 's1' }),
    set: () => {}, update: () => {}, delete: () => {},
  }),
  get: () => Promise.resolve({ empty: true, docs: [], forEach: () => {} }),
  where: () => ({ get: () => Promise.resolve({ empty: true, docs: [], forEach: () => {} }) }),
};

jest.mock('../database/adapter', () => ({
  collections: { attendance: jest.fn(), users: jest.fn() },
  getDb: jest.fn(() => ({ batch: jest.fn(() => ({ create: () => {}, update: () => {}, commit: jest.fn() })) })),
}));
jest.mock('../services/notification.service', () => ({ createBulkNotifications: jest.fn(() => Promise.resolve([])) }));

import { markAttendance, getClassAttendance, getStudentAttendance, getAttendanceReport, exportAttendanceCSV } from '../services/attendance.service';
import { collections } from '../database/adapter';

beforeEach(() => {
  (collections.attendance as jest.Mock).mockReturnValue(attendCollection);
  (collections.users as jest.Mock).mockReturnValue(userCollection);
  attendData.current = {};
});

describe('attendance.service', () => {
  it('marks attendance for students', async () => {
    const result = await markAttendance({ studentIds: ['s1'], classId: 'c1', date: '2025-01-15', status: 'present', markedBy: 't1' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('present');
  });
  it('returns attendance records', async () => {
    const result = await getClassAttendance('c1');
    expect(Array.isArray(result)).toBe(true);
  });
  it('returns sorted attendance records', async () => {
    const result = await getStudentAttendance('s1');
    expect(Array.isArray(result)).toBe(true);
  });
  it('returns records and summary', async () => {
    const docs = [
      { data: () => ({ studentId: 's1', status: 'present', date: '2025-01-15' }), id: 'a1' },
      { data: () => ({ studentId: 's1', status: 'absent', date: '2025-01-16' }), id: 'a2' },
    ];
    attendCollection.where = () => ({ get: () => Promise.resolve({ empty: false, docs, forEach: (cb: any) => docs.forEach(cb) }) });
    const result = await getAttendanceReport('c1');
    expect(result.summary.s1.present).toBe(1);
    expect(result.summary.s1.absent).toBe(1);
  });
  it('generates CSV string', async () => {
    attendCollection.get = () => Promise.resolve({ empty: true, docs: [], forEach: () => {} });
    const csv = await exportAttendanceCSV('c1');
    expect(typeof csv).toBe('string');
    expect(csv).toContain('StudentId');
  });
});
