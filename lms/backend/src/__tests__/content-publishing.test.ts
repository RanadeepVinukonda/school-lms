import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('../services/teacher-class-subject.service', () => ({
  getTeacherAssignment: jest.fn().mockResolvedValue(({ id: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1' }) as any),
}));

jest.mock('../services/notification.service', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue((undefined) as any),
  createNotification: jest.fn().mockResolvedValue((undefined) as any),
}));

import * as contentPublishing from '../services/content-publishing.service';

describe('Content Publishing', () => {
  const mockTeacherId = 'teacher-1';
  const mockClassId = 'class-1';
  const mockStudentId = 'student-1';

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockQuery(mockQuery);
    // Default: empty resolution for nosql queries
    (mockQuery as any)._mockData = [];
    (mockQuery as any)._mockCount = 0;
  });

  describe('publishContent', () => {
    it('should publish content to a class', async () => {
      const result = await contentPublishing.publishContent({
        contentId: 'test-1',
        contentType: 'test',
        classId: mockClassId,
        teacherId: mockTeacherId,
        scope: 'class',
      });

      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'status' in result) {
        expect(result.status).toBe('published');
      }
    });

    it('should publish content to specific students', async () => {
      const result = await contentPublishing.publishContent({
        contentId: 'test-1',
        contentType: 'test',
        classId: mockClassId,
        teacherId: mockTeacherId,
        scope: 'students',
        targetStudentIds: [mockStudentId],
      });

      expect(result).toBeDefined();
    });
  });

  describe('unpublishContent', () => {
    it('should unpublish content', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'pub-1', data: { id: 'pub-1', teacherId: mockTeacherId } },
        error: null,
      }) as any);

      await expect(contentPublishing.unpublishContent('pub-1', mockTeacherId)).resolves.not.toThrow();
    });

    it('should throw on non-existent publish', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);

      await expect(contentPublishing.unpublishContent('bad-id', mockTeacherId)).rejects.toThrow(
        'Published content not found'
      );
    });
  });

  describe('getPublishedContent', () => {
    it('should return published content for a class', async () => {
      (mockQuery as any).data = [];
      const result = await contentPublishing.getPublishedContent(mockClassId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getContentStats', () => {
    it('should return stats', async () => {
      (mockQuery as any).data = [];
      const result = await contentPublishing.getContentStats(mockTeacherId);
      expect(result).toBeDefined();
    });
  });

  describe('scheduleContent', () => {
    it('should schedule content for future publishing', async () => {
      const result = await contentPublishing.scheduleContent({
        contentId: 'test-1',
        contentType: 'test',
        classId: mockClassId,
        teacherId: mockTeacherId,
        scope: 'class',
        title: 'Scheduled Content',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      expect(result).toBeDefined();
    });
  });
});
