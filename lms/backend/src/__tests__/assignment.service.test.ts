import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';

const assignData: any = {};
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
const theDoc = makeDoc(assignData);
function chainable(docs: any[] = [theDoc]) {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c, offset: () => c,
    count: () => ({ get: () => Promise.resolve({ data: () => ({ count: 3 }) }) }),
    get: () => Promise.resolve({ empty: false, docs, size: docs.length, forEach: (cb: any) => docs.forEach(cb) }),
  };
  return c;
}
const assignCollection: any = {
  doc: () => theDoc,
  get: () => Promise.resolve({ empty: false, docs: [theDoc], size: 1, forEach: (cb: Function) => cb(theDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
  firestore: { batch: () => ({ set: () => {}, update: () => {}, commit: () => Promise.resolve() }) },
};

const mockSubDoc = (ref: any) => ({ exists: true, id: 'sub1', get: () => Promise.resolve({ exists: true, data: () => ref.current || {} }), set: () => {}, update: () => {}, delete: () => {} });
const subData: any = { current: {} };
jest.mock('../database/adapter', () => ({
  collections: {
    assignments: jest.fn(),
    submissions: jest.fn(() => ({ doc: () => mockSubDoc(subData), where: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) }) })),
  },
}));
jest.mock('../services/course.service', () => ({ getEnrollments: jest.fn(() => Promise.resolve([])) }));
jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })),
  createBulkNotifications: jest.fn(() => Promise.resolve(['n1'])),
}));

import { createAssignment, updateAssignment, deleteAssignment, getAssignmentById, listAllAssignments, listAssignmentsByCourse, submitAssignment, gradeSubmission } from '../services/assignment.service';
import { collections } from '../database/adapter';

beforeEach(() => {
  (collections.assignments as jest.Mock).mockReturnValue(assignCollection);
  assignCollection.doc = () => theDoc;
  assignData.current = {};
});

describe('assignment.service', () => {
  it('creates and returns assignment', async () => {
    const result = await createAssignment({ title: 'HW1', description: '', courseId: 'c1', dueDate: new Date().toISOString(), points: 100 });
    expect(result.title).toBe('HW1');
  });
  it('returns assignment', async () => {
    assignData.current = { title: 'HW1', courseId: 'c1', maxAttempts: 3 };
    const result = await getAssignmentById('a1');
    expect(result.title).toBe('HW1');
  });
  it('throws NotFoundError for missing', async () => {
    assignCollection.doc = () => ({ exists: false, get: () => Promise.resolve({ exists: false }), data: () => ({}), set: () => {}, update: () => {}, delete: () => {} });
    await expect(getAssignmentById('bad')).rejects.toThrow(NotFoundError);
  });
  it('returns paginated assignments', async () => {
    const result = await listAllAssignments({ page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBe(3);
  });
  it('returns assignments for course', async () => {
    const result = await listAssignmentsByCourse('c1', { page: '1', limit: '10' });
    expect(result.items).toBeDefined();
  });
  it('updates assignment fields', async () => {
    assignData.current = { title: 'HW1', courseId: 'c1' };
    const result = await updateAssignment('a1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });
  it('deletes assignment', async () => {
    assignData.current = { title: 'HW1' };
    await expect(deleteAssignment('a1')).resolves.not.toThrow();
  });
  it('submits within max attempts', async () => {
    assignData.current = { title: 'HW1', courseId: 'c1', maxAttempts: 3, dueDate: new Date(Date.now() + 86400000).toISOString() };
    const result = await submitAssignment('a1', 's1', { content: 'My answer' });
    expect(result.status).toBe('submitted');
  });
  it('grades a submission', async () => {
    assignData.current = { title: 'HW1', courseId: 'c1' };
    await expect(gradeSubmission('a1', 'sub1', { score: 90, totalPoints: 100 })).resolves.not.toThrow();
  });
});
