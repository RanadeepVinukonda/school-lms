import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('../services/teacher-class-subject.service', () => ({
  getTeacherAssignment: jest.fn().mockResolvedValue(({ id: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1', subjectId: 'subject-1' }) as any),
}));

jest.mock('../services/concept-questions.service', () => ({
  fetchConceptQuestions: jest.fn().mockResolvedValue(([
    { id: 'q1', type: 'mcq', question: 'What is 2+2?', options: ['3', '4', '5', '6'], correctAnswer: '4', difficulty: 'easy', points: 1 },
  ]) as any),
  upsertConceptQuestions: jest.fn().mockResolvedValue((undefined) as any),
}));

jest.mock('../services/ai-question-generator.service', () => ({
  generateQuestionsForConcept: jest.fn().mockResolvedValue(([
    { id: 'ai-q1', type: 'mcq', question: 'AI generated?', options: ['Yes', 'No'], answer: 'Yes', difficulty: 'easy', points: 1, explanation: 'AI test' },
  ]) as any),
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

jest.mock('../services/notification.service', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue((undefined) as any),
  createNotification: jest.fn().mockResolvedValue((undefined) as any),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-12345'),
}));

import * as unifiedTestEngine from '../services/unified-test-engine.service';

describe('Unified Test Engine', () => {
  const mockTeacherId = 'teacher-1';
  const mockClassId = 'class-1';
  const mockStudentId = 'student-1';
  const mockBaseData = {
    title: 'Test Quiz',
    description: 'A test quiz description',
    testType: 'quiz' as const,
    classId: mockClassId,
    textbookId: 'textbook-1',
    chapterId: 'chapter-1',
    conceptId: 'concept-1',
    teacherId: mockTeacherId,
    timeLimitMinutes: 30,
    selectedModels: ['multiple_choice'] as any[],
    questionCount: 5,
    passingScore: 40,
    maxAttempts: 3,
    shuffleQuestions: true,
    showResults: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockQuery(mockQuery);
    // Default: empty resolution for nosql queries
    (mockQuery as any)._mockData = [];
    // Mock concept data for createTest flow
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'Test Concept', name: 'Test Concept' }, error: null }) as any);
  });

  describe('createTest', () => {
    it('should create a quiz test successfully', async () => {
      const result = await unifiedTestEngine.createTest(mockBaseData);
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Quiz');
      expect(result.testType).toBe('quiz');
      expect(result.classId).toBe(mockClassId);
      expect(result.teacherId).toBe(mockTeacherId);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.status).toBe('released');
    });

    it('should create an exam with maxAttempts=1', async () => {
      const result = await unifiedTestEngine.createTest({
        ...mockBaseData,
        testType: 'exam',
        maxAttempts: undefined as any,
      });
      expect(result.maxAttempts).toBe(1);
    });

    it('should return preview without saving', async () => {
      const result = await unifiedTestEngine.createTest({
        ...mockBaseData,
        preview: true,
      });
      expect(result.preview).toBe(true);
      expect(result.questions).toBeDefined();
    });

    it('should throw if teacher not assigned to class', async () => {
      const { getTeacherAssignment } = require('../services/teacher-class-subject.service');
      getTeacherAssignment.mockResolvedValueOnce(null);

      await expect(unifiedTestEngine.createTest(mockBaseData)).rejects.toThrow(
        'You are not assigned to this class'
      );
    });
  });

  describe('createTestTemplate', () => {
    it('should create a template successfully', async () => {
      const result = await unifiedTestEngine.createTestTemplate({
        name: 'My Template',
        description: 'A reusable template',
        teacherId: mockTeacherId,
        testType: 'quiz',
        selectedModels: ['multiple_choice', 'true_false'],
        timeLimitMinutes: 20,
        questionCount: 10,
        passingScore: 50,
        maxAttempts: 3,
        shuffleQuestions: true,
        showResults: false,
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('My Template');
      expect(result.teacherId).toBe(mockTeacherId);
    });
  });

  describe('getTeacherTemplates', () => {
    it('should return templates for a teacher', async () => {
      const result = await unifiedTestEngine.getTeacherTemplates(mockTeacherId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateTestTemplate', () => {
    it('should throw on non-existent template', async () => {
      // Default maybeSingle returns null → nosqlGet returns { exists: false }
      await expect(unifiedTestEngine.updateTestTemplate('bad-id', mockTeacherId, { name: 'New' })).rejects.toThrow(
        'Template not found'
      );
    });
  });

  describe('startTestAttempt', () => {
    it('should start an attempt for a student', async () => {
      const releasedAt = new Date().toISOString();

      // Mock test data with releasedAt
      mockQuery.maybeSingle.mockResolvedValue(({
        data: {
          doc_id: 'test-1',
          data: {
            id: 'test-1',
            title: 'Test',
            testType: 'quiz',
            classId: mockClassId,
            teacherId: mockTeacherId,
            releasedAt,
            maxAttempts: 3,
            questions: [
              { id: 'q1', text: 'Q1', difficulty: 'easy' },
              { id: 'q2', text: 'Q2', difficulty: 'medium' },
            ],
            timeLimitMinutes: 30,
            questionCount: 2,
            selectedModels: ['mcq'],
            shuffleQuestions: false,
            publishedTo: 'class',
            targetStudentIds: [],
            startDate: null,
            endDate: null,
          },
        },
        error: null,
      }) as any);

      const result = await unifiedTestEngine.startTestAttempt('test-1', mockStudentId);
      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
    });
  });

  describe('submitTestAttempt', () => {
    it('should submit and grade a test attempt', async () => {
      const attemptData = {
        id: 'attempt-1',
        quizId: 'test-1',
        studentId: mockStudentId,
        status: 'in_progress',
        totalPoints: 10,
        startedAt: new Date(Date.now() - 60000).toISOString(),
      };

      const testData = {
        id: 'test-1',
        title: 'Test',
        teacherId: mockTeacherId,
        timeLimitMinutes: 60,
        showResults: true,
        passingScore: 40,
        questions: [
          { id: 'q1', text: '2+2?', correctAnswer: '4', difficulty: 'easy', type: 'mcq' },
        ],
      };

      // Mock attempt data
      mockQuery.maybeSingle
        .mockResolvedValueOnce({
          data: { doc_id: 'attempt-1', data: attemptData },
          error: null,
        })
        // Mock test data
        .mockResolvedValueOnce({
          data: { doc_id: 'test-1', data: testData },
          error: null,
        });

      const result = await unifiedTestEngine.submitTestAttempt('attempt-1', mockStudentId, {
        answers: [
          { questionId: 'q1', answer: '4', timeSpent: 10 },
        ],
        startedAt: attemptData.startedAt,
        submittedAt: new Date().toISOString(),
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('getTestResults', () => {
    it('should return results for a test', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'test-1', data: { id: 'test-1', showResults: true } },
        error: null,
      }) as any);

      const result = await unifiedTestEngine.getTestResults('test-1', mockStudentId, true);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('releaseResults', () => {
    it('should toggle results visibility', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'test-1', data: { id: 'test-1', teacherId: mockTeacherId } },
        error: null,
      }) as any);

      const result = await unifiedTestEngine.releaseResults('test-1', true, mockTeacherId);
      expect(result).toBeDefined();
    });
  });

  describe('deleteTest', () => {
    it('should delete a test with cascade', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'test-1', data: { id: 'test-1', teacherId: mockTeacherId } },
        error: null,
      }) as any);

      await expect(unifiedTestEngine.deleteTest('test-1', mockTeacherId)).resolves.not.toThrow();
    });
  });
});
