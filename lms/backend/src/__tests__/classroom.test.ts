import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: { id: 'mapped-user-id', email: 'stu@school.edu' }, error: null }),
      insert: () => chain,
      single: () => Promise.resolve({ data: { id: 'new-user-id' }, error: null }),
    };
    return { from: jest.fn(() => chain) };
  }),
}));

import * as classroomService from '../services/classroom.service';

describe('Google Classroom Service', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          courses: [{ id: 'course-1', name: 'Math 101' }],
          students: [{ profile: { emailAddress: 'stu@school.edu', name: { fullName: 'Student Test' } } }],
          studentSubmissions: [{ id: 'submission-1', userId: 'user-1' }]
        }),
      } as Response)
    ) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should list classroom courses', async () => {
    const courses = await classroomService.getCourses('mock-token');
    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe('Math 101');
  });

  it('should sync roster', async () => {
    const res = await classroomService.syncRoster('school-1', 'mock-token', 'course-1', 'class-1');
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
  });

  it('should push grade', async () => {
    const res = await classroomService.pushGrade('mock-token', 'course-1', 'work-1', 'stu@school.edu', 95);
    expect(res.success).toBe(true);
  });
});
