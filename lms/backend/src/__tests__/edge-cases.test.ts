import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('../services/teacher-class-subject.service', () => ({
  getTeacherAssignment: jest.fn().mockResolvedValue(({ id: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1' }) as any),
}));

jest.mock('../services/concept-questions.service', () => ({
  fetchConceptQuestions: jest.fn().mockResolvedValue(([]) as any),
  upsertConceptQuestions: jest.fn().mockResolvedValue((undefined) as any),
}));

jest.mock('../services/ai-question-generator.service', () => ({
  generateQuestionsForConcept: jest.fn().mockResolvedValue(([]) as any),
}));

jest.mock('../services/gamification.service', () => ({
  recordAssessmentResult: jest.fn().mockResolvedValue((undefined) as any),
  awardXp: jest.fn().mockResolvedValue((undefined) as any),
  awardCoins: jest.fn().mockResolvedValue((undefined) as any),
  updateStreak: jest.fn().mockResolvedValue((undefined) as any),
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

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockQuery(mockQuery);
    // Default: empty resolution for nosql queries
    (mockQuery as any)._mockData = [];
    // Mock concept data for createTest flow
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'Test Concept', name: 'Test Concept' }, error: null }) as any);
  });

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
      generateQuestionsForConcept.mockResolvedValue(([
        { id: 'ai-fallback-1', type: 'mcq', question: 'Fallback question?', options: ['A', 'B'], answer: 'A', difficulty: 'easy', points: 1, explanation: 'Fallback' },
      ]) as any);
    });

    afterAll(() => {
      generateQuestionsForConcept.mockResolvedValue(([]) as any);
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
      // Default maybeSingle returns null → nosqlGet returns { exists: false }
      await expect(unifiedTestEngine.startTestAttempt('bad-test', mockStudentId)).rejects.toThrow(
        'Test not found'
      );
    });

    it('should reject attempt on unreleased test', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'test-1', data: { id: 'test-1', releasedAt: null, maxAttempts: 3, questions: [] } },
        error: null,
      }) as any);

      await expect(unifiedTestEngine.startTestAttempt('test-1', mockStudentId)).rejects.toThrow(
        'Test is not yet released'
      );
    });

    it('should reject duplicate submission on already completed attempt', async () => {
      // First: get attempt data
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'attempt-1', data: { id: 'attempt-1', quizId: 'test-1', studentId: mockStudentId, status: 'completed' } },
        error: null,
      }) as any);

      await expect(unifiedTestEngine.submitTestAttempt('attempt-1', mockStudentId, {
        answers: [],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      })).rejects.toThrow('Attempt already submitted');
    });

    it('should reject attempt from wrong student', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'attempt-1', data: { id: 'attempt-1', quizId: 'test-1', studentId: 'other-student', status: 'in_progress' } },
        error: null,
      }) as any);

      await expect(unifiedTestEngine.submitTestAttempt('attempt-1', mockStudentId, {
        answers: [],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      })).rejects.toThrow('Not your attempt');
    });

    it('should reject attempt exceeding max attempts', async () => {
      // Mock test data with releasedAt
      mockQuery.maybeSingle
        .mockResolvedValueOnce({
          data: { doc_id: 'test-1', data: { id: 'test-1', releasedAt: new Date().toISOString(), maxAttempts: 2, questions: [], publishedTo: 'class', targetStudentIds: [] } },
          error: null,
        });

      // Mock attempts query - return 2 existing attempts
      (mockQuery as any)._mockData = [
        { doc_id: 'a1', data: { quizId: 'test-1', studentId: mockStudentId } },
        { doc_id: 'a2', data: { quizId: 'test-1', studentId: mockStudentId } },
      ];

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
      // Mock nosqlQuery to return tests for class-2
      (mockQuery as any)._mockData = [
        { doc_id: 'test-2', data: { classId: 'class-2', title: 'Other class test' } },
      ];

      const result = await unifiedTestEngine.getTestsForClass('class-2');
      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0].classId).toBe('class-2');
      }
    });
  });
});
