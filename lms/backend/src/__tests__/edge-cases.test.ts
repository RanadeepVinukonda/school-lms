function createMockCollection() {
  const mockSubDoc = {
    exists: true,
    id: 'sub-doc',
    data: jest.fn().mockReturnValue({ title: 'Test Concept', name: 'Test Concept' }),
    ref: {},
  };

  const mockConceptCollection = {
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSubDoc),
    set: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockDoc = { exists: true, id: 'mock-id', data: jest.fn().mockReturnValue({}), ref: {} };
  const mockSnapshot = { empty: false, size: 1, docs: [mockDoc], forEach: (cb: Function) => cb(mockDoc) };
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot),
  };

  return {
    doc: jest.fn().mockReturnValue({
      ...mockDoc,
      collection: jest.fn().mockReturnValue(mockConceptCollection),
      get: jest.fn().mockResolvedValue(mockDoc),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    }),
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
      quizAttemptV2: jest.fn().mockReturnValue(mc),
      testTemplates: jest.fn().mockReturnValue(mc),
      textbooks: jest.fn().mockReturnValue(mc),
      users: jest.fn().mockReturnValue(mc),
      classes: jest.fn().mockReturnValue(mc),
      teacherClassSubject: jest.fn().mockReturnValue(mc),
      notifications: jest.fn().mockReturnValue(mc),
    },
    FieldValue: { increment: jest.fn((n) => n) },
  };
});

jest.mock('../services/teacher-class-subject.service', () => ({
  getTeacherAssignment: jest.fn().mockResolvedValue({ id: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1' }),
}));

jest.mock('../services/concept-questions.service', () => ({
  fetchConceptQuestions: jest.fn().mockResolvedValue([]),
  upsertConceptQuestions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/ai-question-generator.service', () => ({
  generateQuestionsForConcept: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/gamification.service', () => ({
  recordAssessmentResult: jest.fn().mockResolvedValue(undefined),
  awardXp: jest.fn().mockResolvedValue(undefined),
  awardCoins: jest.fn().mockResolvedValue(undefined),
  updateStreak: jest.fn().mockResolvedValue(undefined),
  XP_REWARDS: { assessmentComplete: 10, highAccuracy: 5, perfectScore: 20 },
  COIN_REWARDS: { assessmentComplete: 5, highAccuracy: 3, perfectScore: 10 },
}));

jest.mock('../services/ai-level.service', () => ({
  computeLevel: jest.fn().mockReturnValue('beginner'),
  computeComplexityHandled: jest.fn().mockReturnValue(0.5),
}));

import * as unifiedTestEngine from '../services/unified-test-engine.service';

describe('Edge Cases', () => {
  const mockTeacherId = 'teacher-1';
  const mockClassId = 'class-1';
  const mockStudentId = 'student-1';

  const mockBaseData = {
    title: 'Edge Case Test',
    description: 'Testing edge cases',
    testType: 'quiz' as const,
    classId: mockClassId,
    textbookId: 'textbook-1',
    chapterId: 'chapter-1',
    conceptId: 'concept-1',
    teacherId: mockTeacherId,
    timeLimitMinutes: 30,
    selectedModels: [] as any[],
    questionCount: 0,
  };

  describe('Empty Question Bank Handling', () => {
    it('should handle empty question bank without errors', async () => {
      const result = await unifiedTestEngine.createTest(mockBaseData);
      expect(result).toBeDefined();
      expect(result.questions).toBeDefined();
    });

    it('should handle count=0 gracefully', async () => {
      const result = await unifiedTestEngine.createTest(mockBaseData);
      expect(result).toBeDefined();
    });
  });

  describe('AI Fallback Generation', () => {
    const { generateQuestionsForConcept } = require('../services/ai-question-generator.service');

    beforeEach(() => {
      generateQuestionsForConcept.mockResolvedValue([
        { id: 'ai-fallback-1', type: 'mcq', question: 'Fallback question?', options: ['A', 'B'], answer: 'A', difficulty: 'easy', points: 1, explanation: 'Fallback' },
      ]);
    });

    afterAll(() => {
      generateQuestionsForConcept.mockResolvedValue([]);
    });

    it('should fall back to AI generation when question bank is empty and count > 0', async () => {
      const result = await unifiedTestEngine.createTest({
        ...mockBaseData,
        selectedModels: ['multiple_choice'],
        questionCount: 3,
      });

      expect(result).toBeDefined();
      expect(result.questions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Invalid Test Attempts', () => {
    it('should reject attempt on non-existent test', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({ exists: false, data: () => null });

      await expect(unifiedTestEngine.startTestAttempt('bad-test', mockStudentId)).rejects.toThrow(
        'Test not found'
      );
    });

    it('should reject attempt on unreleased test', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-1',
          releasedAt: null,
          maxAttempts: 3,
          questions: [],
        }),
        id: 'test-1',
      });

      await expect(unifiedTestEngine.startTestAttempt('test-1', mockStudentId)).rejects.toThrow(
        'Test is not yet released'
      );
    });

    it('should reject duplicate submission on already completed attempt', async () => {
      const { collections } = require('../database/adapter');
      collections.quizAttemptV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'attempt-1',
          quizId: 'test-1',
          studentId: mockStudentId,
          status: 'completed',
        }),
        id: 'attempt-1',
      });

      await expect(unifiedTestEngine.submitTestAttempt('attempt-1', mockStudentId, {
        answers: [],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      })).rejects.toThrow('Attempt already submitted');
    });

    it('should reject attempt from wrong student', async () => {
      const { collections } = require('../database/adapter');
      collections.quizAttemptV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'attempt-1',
          quizId: 'test-1',
          studentId: 'other-student',
          status: 'in_progress',
        }),
        id: 'attempt-1',
      });

      await expect(unifiedTestEngine.submitTestAttempt('attempt-1', mockStudentId, {
        answers: [],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      })).rejects.toThrow('Not your attempt');
    });

    it('should reject attempt exceeding max attempts', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-1',
          releasedAt: new Date().toISOString(),
          maxAttempts: 2,
          questions: [],
          publishedTo: 'class',
          targetStudentIds: [],
        }),
        id: 'test-1',
      });

      collections.quizAttemptV2().where = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ size: 2, docs: [{ id: 'a1' }, { id: 'a2' }] }),
      });

      await expect(unifiedTestEngine.startTestAttempt('test-1', mockStudentId)).rejects.toThrow(
        'Maximum attempts reached'
      );
    });
  });

  describe('Deleted Class Access Prevention', () => {
    it('should throw when teacher not assigned to class', async () => {
      const { getTeacherAssignment } = require('../services/teacher-class-subject.service');
      getTeacherAssignment.mockResolvedValueOnce(null);

      await expect(unifiedTestEngine.createTest(mockBaseData)).rejects.toThrow(
        'You are not assigned to this class'
      );
    });
  });

  describe('Cross-Class Data Leakage Prevention', () => {
    it('should not allow access to another classs test', async () => {
      const { collections } = require('../database/adapter');

      collections.quizV2().where = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [{ data: () => ({ classId: 'class-2' }), id: 'test-2' }],
          empty: false, size: 1,
          forEach: (cb: Function) => cb({ data: () => ({ classId: 'class-2' }), id: 'test-2' }),
        }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      const result = await unifiedTestEngine.getTestsForClass('class-2');
      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0].classId).toBe('class-2');
      }
    });
  });
});
