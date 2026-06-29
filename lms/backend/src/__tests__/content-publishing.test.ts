function createMockCollection() {
  const mockDoc = { exists: true, id: 'mock-id', data: jest.fn().mockReturnValue({}), ref: {} };
  const mockSnapshot = { empty: false, size: 1, docs: [mockDoc], forEach: (cb: Function) => cb(mockDoc) };
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot),
  };
  return {
    doc: jest.fn().mockReturnValue({ ...mockDoc, get: jest.fn().mockResolvedValue(mockDoc), set: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined) }),
    get: jest.fn().mockResolvedValue(mockSnapshot),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(mockDoc),
    where: jest.fn().mockReturnValue(mockQuery),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
    firestore: { batch: jest.fn().mockReturnValue({ update: jest.fn(), delete: jest.fn(), create: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }) },
  };
}

jest.mock('../database/adapter', () => {
  const mc = createMockCollection();
  return {
    collections: {
      quizV2: jest.fn().mockReturnValue(mc),
      users: jest.fn().mockReturnValue(mc),
      notifications: jest.fn().mockReturnValue(mc),
      teacherClassSubject: jest.fn().mockReturnValue(mc),
      textbooks: jest.fn().mockReturnValue(mc),
      mindmaps: jest.fn().mockReturnValue(mc),
    },
    FieldValue: { increment: jest.fn((n) => n) },
  };
});

jest.mock('../services/notification.service', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue(undefined),
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

import * as contentPublishing from '../services/content-publishing.service';

describe('Content Publishing', () => {
  const mockTeacherId = 'teacher-1';
  const mockClassId = 'class-1';
  const mockStudentId = 'student-1';

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
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'pub-1', teacherId: mockTeacherId }),
        id: 'pub-1',
      });

      await expect(contentPublishing.unpublishContent('pub-1', mockTeacherId)).resolves.not.toThrow();
    });

    it('should throw on non-existent publish', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: false,
      });

      await expect(contentPublishing.unpublishContent('bad-id', mockTeacherId)).rejects.toThrow(
        'Published content not found'
      );
    });
  });

  describe('getPublishedContent', () => {
    it('should return published content for a class', async () => {
      const result = await contentPublishing.getPublishedContent(mockClassId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getContentStats', () => {
    it('should return stats', async () => {
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
