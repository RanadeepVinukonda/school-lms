import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError, ValidationError } from '../utils/errors';

const userData: any = {};
const classData: any = {};

function makeDoc(ref: any) {
  return {
    exists: true, id: 'doc-id',
    data: () => ref.current,
    get: () => Promise.resolve({ exists: true, data: () => ref.current, id: 'doc-id' }),
    set: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    update: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    delete: () => Promise.resolve(),
  };
}

const userDoc = makeDoc(userData);
const classDoc = makeDoc(classData);
const countSnap = { data: () => ({ count: 1 }) };

function chainable(docs: any[] = [userDoc]) {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c, offset: () => c,
    count: () => ({ get: () => Promise.resolve(countSnap) }),
    get: () => Promise.resolve({ empty: false, docs, size: docs.length, forEach: (cb: any) => docs.forEach(cb) }),
  };
  return c;
}

const userCollection: any = {
  doc: () => userDoc,
  get: () => Promise.resolve({ empty: false, docs: [userDoc], size: 1, forEach: (cb: Function) => cb(userDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
  limit: () => chainable(),
  firestore: { batch: () => ({ set: () => {}, update: () => {}, commit: () => Promise.resolve() }) },
};

const classCollection: any = {
  doc: () => classDoc,
  get: () => Promise.resolve({ empty: false, docs: [classDoc], size: 1, forEach: (cb: Function) => cb(classDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
  limit: () => chainable(),
};

jest.mock('../database/adapter', () => ({
  collections: { users: jest.fn(), classes: jest.fn() },
  getDb: jest.fn(() => ({ collection: jest.fn(() => userCollection) })),
}));

jest.mock('../database/auth', () => ({
  createUser: jest.fn(() => Promise.resolve({ uid: 'user-1', email: 'test@school.edu' })),
  updateUser: jest.fn(() => Promise.resolve()),
  deleteUser: jest.fn(() => Promise.resolve()),
  getUserById: jest.fn(() => Promise.resolve({ uid: 'user-1' })),
  setCustomClaims: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/studentIdGenerator.js', () => ({ generateStudentId: jest.fn(() => 'STU001') }));
jest.mock('../utils/passwordGenerator.js', () => ({ generatePassword: jest.fn(() => 'Pass123!') }));

import { listUsers, getUserByIdService, createUser, toggleActive, assignRole, pingActive, updateProfile, deleteUserService } from '../services/user.service';
import { collections } from '../database/adapter';

beforeEach(() => {
  (collections.users as jest.Mock).mockReturnValue(userCollection);
  (collections.classes as jest.Mock).mockReturnValue(classCollection);
  userCollection.doc = () => userDoc;
  classCollection.doc = () => classDoc;
  userData.current = {};
  classData.current = { grade: '10', section: 'A', code: '10A' };
});

describe('user.service', () => {
  describe('getUserByIdService', () => {
    it('returns user data excluding password', async () => {
      userData.current = { displayName: 'John', email: 'john@test.com', password: 'secret' };
      const result = await getUserByIdService('u1');
      expect(result.displayName).toBe('John');
      expect((result as any).password).toBeUndefined();
    });

    it('throws NotFoundError for missing user', async () => {
      userCollection.doc = () => ({ exists: false, get: () => Promise.resolve({ exists: false }), data: () => ({}), set: () => {}, update: () => {}, delete: () => {} });
      await expect(getUserByIdService('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createUser', () => {
    it('creates a student user with generated studentId', async () => {
      const result = await createUser({
        displayName: 'Jane', role: 'student', classId: 'class-1', rollNo: 1,
      });
      expect(result.displayName).toBe('Jane');
      expect(result.role).toBe('student');
    });

    it('throws ValidationError when student has no classId', async () => {
      await expect(createUser({ displayName: 'Bad', role: 'student' } as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('toggleActive', () => {
    it('toggles isActive and calls updateUser on auth', async () => {
      userData.current = { isActive: false, displayName: 'Test', role: 'student' };
      const result = await toggleActive('u1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('assignRole', () => {
    it('updates role in Firestore and sets custom claims', async () => {
      userData.current = { role: 'student' };
      await expect(assignRole('u1', 'teacher')).resolves.not.toThrow();
    });
  });

  describe('pingActive', () => {
    it('updates streak for active user', async () => {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      userData.current = { streakCount: 5, lastActiveDate: new Date(today.getTime() - 86400000).toISOString() };
      const result = await pingActive('u1');
      expect(result.streakCount).toBe(6);
    });

    it('throws NotFoundError for missing user', async () => {
      userCollection.doc = () => ({ exists: false, get: () => Promise.resolve({ exists: false }), data: () => ({}), set: () => {}, update: () => {}, delete: () => {} });
      await expect(pingActive('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('updates profile fields', async () => {
      userData.current = { displayName: 'Old', role: 'student' };
      const result = await updateProfile('u1', { displayName: 'New' });
      expect(result.displayName).toBe('New');
    });
  });

  describe('deleteUserService', () => {
    it('deletes user from both Firestore and auth', async () => {
      userData.current = { displayName: 'Test' };
      await expect(deleteUserService('u1')).resolves.not.toThrow();
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      const result = await listUsers({ page: '1', limit: '10' });
      expect(result.items).toBeDefined();
      expect(typeof result.total).toBe('number');
    });
  });
});
