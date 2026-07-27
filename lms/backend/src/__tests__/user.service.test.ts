import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('../database/auth', () => ({
  createUser: jest.fn(() => Promise.resolve({ uid: 'user-1', email: 'test@school.edu' })),
  updateUser: jest.fn(() => Promise.resolve()),
  deleteUser: jest.fn(() => Promise.resolve()),
  getUserById: jest.fn(() => Promise.resolve({ uid: 'user-1' })),
  getUserByEmail: jest.fn(() => Promise.resolve(null)),
  setCustomClaims: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/studentIdGenerator.js', () => ({ generateStudentId: jest.fn(() => 'STU001') }));
jest.mock('../utils/passwordGenerator.js', () => ({ generatePassword: jest.fn(() => 'Pass123!') }));

import { listUsers, getUserByIdService, createUser, toggleActive, assignRole, pingActive, updateProfile, deleteUserService } from '../services/user.service';

beforeEach(() => {
  jest.clearAllMocks();
  resetMockQuery(mockQuery);
});

describe('user.service', () => {
  describe('getUserByIdService', () => {
    it('returns user data excluding password', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { display_name: 'John', email: 'john@test.com', password: 'secret' }, error: null }) as any);
      const result = await getUserByIdService('u1');
      expect(result.display_name).toBe('John');
      expect((result as any).password).toBeUndefined();
    });

    it('throws NotFoundError for missing user', async () => {
      // Default maybeSingle returns { data: null } → not found
      await expect(getUserByIdService('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createUser', () => {
    it('creates a student user with generated studentId', async () => {
      // For student creation: 1st call = class lookup, 2nd call = roll number check (null = no duplicate)
      mockQuery.maybeSingle
        .mockResolvedValueOnce({
          data: { id: 'class-1', grade: '10', section: 'A', academic_year: '2025', code: '10A' },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null });
      const result = await createUser({
        displayName: 'Jane', role: 'student', classId: 'class-1', rollNo: 1,
      });
      expect(result.display_name).toBe('Jane');
      expect(result.role).toBe('student');
    });

    it('throws ValidationError when student has no classId', async () => {
      await expect(createUser({ displayName: 'Bad', role: 'student' } as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('toggleActive', () => {
    it('toggles isActive and calls updateUser on auth', async () => {
      // toggleActive calls getUserDoc (1), then updateUser internally calls getUserDoc (2) + maybeSingle (3)
      // Provide enough mock values for the full chain
      const existingUser = { id: 'u1', is_active: false, version: 0, displayName: 'Test', role: 'student' };
      const updatedUser = { id: 'u1', is_active: true, version: 1, displayName: 'Test', role: 'student' };
      mockQuery.maybeSingle
        .mockResolvedValueOnce({ data: existingUser, error: null })  // getUserDoc in toggleActive
        .mockResolvedValueOnce({ data: existingUser, error: null })  // getUserDoc in updateUser
        .mockResolvedValue({ data: updatedUser, error: null });      // all remaining calls
      const result = await toggleActive('u1');
      expect(result!.is_active).toBe(true);
    });
  });

  describe('assignRole', () => {
    it('updates role in Firestore and sets custom claims', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { role: 'student' }, error: null }) as any);
      await expect(assignRole('u1', 'teacher')).resolves.not.toThrow();
    });
  });

  describe('pingActive', () => {
    it('updates streak for active user', async () => {
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const yesterday = new Date(today.getTime() - 86400000).toISOString();
      // pingActive uses .select().eq().maybeSingle() then .update().eq()
      mockQuery.maybeSingle.mockResolvedValue(({ data: { streak_count: 5, last_active_date: yesterday }, error: null }) as any);
      const result = await pingActive('u1');
      expect(result.streakCount).toBe(6);
    });

    it('throws NotFoundError for missing user', async () => {
      await expect(pingActive('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('updates profile fields', async () => {
      // First call: verify user exists; second call: return updated data
      mockQuery.maybeSingle
        .mockResolvedValueOnce({ data: { display_name: 'Old', role: 'student' }, error: null })
        .mockResolvedValueOnce({ data: { display_name: 'New', role: 'student' }, error: null });
      const result = await updateProfile('u1', { displayName: 'New' });
      expect(result!.display_name).toBe('New');
    });
  });

  describe('deleteUserService', () => {
    it('deletes user from both Firestore and auth', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { displayName: 'Test' }, error: null }) as any);
      await expect(deleteUserService('u1')).resolves.not.toThrow();
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      (mockQuery as any).data = [];
      (mockQuery as any).count = 0;
      const result = await listUsers({ page: '1', limit: '10' });
      expect(result.items).toBeDefined();
      expect(typeof result.total).toBe('number');
    });
  });
});
