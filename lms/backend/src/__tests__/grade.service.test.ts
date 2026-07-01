import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';

const gradeData: any = {};
function makeDoc(ref: any) {
  return {
    exists: true, id: 'grade-1',
    data: () => ref.current,
    get: () => Promise.resolve({ exists: true, data: () => ref.current, id: 'grade-1' }),
    set: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    update: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    delete: () => Promise.resolve(),
  };
}
const gradeDoc = makeDoc(gradeData);
function chainable(docs: any[] = [gradeDoc]) {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c, offset: () => c,
    count: () => ({ get: () => Promise.resolve({ data: () => ({ count: 1 }) }) }),
    get: () => Promise.resolve({ empty: false, docs, size: docs.length, forEach: (cb: any) => docs.forEach(cb) }),
  };
  return c;
}
const gradeCollection: any = {
  doc: () => gradeDoc,
  get: () => Promise.resolve({ empty: false, docs: [gradeDoc], size: 1, forEach: (cb: Function) => cb(gradeDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
};

jest.mock('../database/adapter', () => ({ collections: { grades: jest.fn() } }));
jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })),
  createBulkNotifications: jest.fn(() => Promise.resolve(['n1'])),
}));

import { getStudentGrades, getGradebook, updateGrade, bulkUpdate, generateReport } from '../services/grade.service';
import { collections } from '../database/adapter';

beforeEach(() => {
  (collections.grades as jest.Mock).mockReturnValue(gradeCollection);
  gradeData.current = {};
});

describe('grade.service', () => {
  it('returns grades for a student', async () => {
    const result = await getStudentGrades('s1');
    expect(Array.isArray(result)).toBe(true);
  });
  it('returns paginated gradebook', async () => {
    const result = await getGradebook({ classId: 'c1', page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
  it('updates and returns grade with letter grade', async () => {
    gradeData.current = { studentId: 's1', courseId: 'c1', score: 50, totalPoints: 100 };
    const result = await updateGrade('grade-1', { score: 90, totalPoints: 100, gradedBy: 't1' });
    expect(result.letterGrade).toBeDefined();
  });
  it('throws NotFoundError for missing grade', async () => {
    gradeCollection.doc = () => ({ exists: false, get: () => Promise.resolve({ exists: false }), data: () => ({}), set: () => {}, update: () => {}, delete: () => {} });
    await expect(updateGrade('bad', { score: 50, totalPoints: 100, gradedBy: 't1' })).rejects.toThrow(NotFoundError);
  });
  it('updates multiple grades', async () => {
    const result = await bulkUpdate([{ studentId: 's1', score: 90, totalPoints: 100 }], 'c1', 't1');
    expect(result).toHaveLength(1);
  });
  it('generates report with summary', async () => {
    const gd = { current: { score: 85, totalPoints: 100 } };
    const doc2 = makeDoc(gd);
    const qc: any = { where: () => qc, get: () => Promise.resolve({ empty: false, docs: [doc2], forEach: (cb: Function) => cb(doc2) }) };
    gradeCollection.where = () => qc;
    const result = await generateReport('s1', '2025', '1');
    expect(result.summary).toBeDefined();
    expect(result.summary.letterGrade).toBe('B');
  });
});
