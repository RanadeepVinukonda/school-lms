import { randomUUID } from 'crypto';

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
    delete: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(mockSubDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    firestore: { batch: () => ({ update: jest.fn(), delete: jest.fn(), create: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }) },
  };

  const mockDoc = {
    exists: true,
    id: 'mock-id',
    data: jest.fn().mockReturnValue({}),
    ref: {},
  };

  const mockSnapshot = {
    empty: false,
    size: 1,
    docs: [mockDoc],
    forEach: (cb: Function) => cb(mockDoc),
  };

  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot),
  };

  const mockCollection = {
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
    firestore: {
      batch: jest.fn().mockReturnValue({
        update: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };

  return mockCollection;
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
      notifications: jest.fn().mockReturnValue(mc),
    },
    FieldValue: {
      increment: jest.fn((n) => n),
    },
  };
});

jest.mock('../services/teacher-class-subject.service', () => ({
  getTeacherAssignment: jest.fn().mockResolvedValue({ id: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1', subjectId: 'subject-1' }),
}));

jest.mock('../services/concept-questions.service', () => ({
  fetchConceptQuestions: jest.fn().mockResolvedValue([
    { id: 'q1', type: 'mcq', question: 'What is 2+2?', options: ['3', '4', '5', '6'], correctAnswer: '4', difficulty: 'easy', points: 1 },
  ]),
  upsertConceptQuestions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/ai-question-generator.service', () => ({
  generateQuestionsForConcept: jest.fn().mockResolvedValue([
    { id: 'ai-q1', type: 'mcq', question: 'AI generated?', options: ['Yes', 'No'], answer: 'Yes', difficulty: 'easy', points: 1, explanation: 'AI test' },
  ]),
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
      const { collections } = require('../database/adapter');
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      collections.testTemplates().doc().get = mockGet;

      await expect(unifiedTestEngine.updateTestTemplate('bad-id', mockTeacherId, { name: 'New' })).rejects.toThrow(
        'Template not found'
      );
    });
  });

  describe('startTestAttempt', () => {
    it('should start an attempt for a student', async () => {
      const { collections } = require('../database/adapter');

      const releasedAt = new Date().toISOString();

      // Set up users mock FIRST so quizV2 doc override happens after
      collections.users().doc = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ level: 'beginner' }),
          id: 'student-1',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      });

      // Now set quizV2 doc override (must be AFTER users to avoid overwrite)
      collections.quizV2().doc = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
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
          }),
          id: 'test-1',
        }),
        update: jest.fn().mockResolvedValue(undefined),
        set: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }) }),
      });

      collections.quizAttemptV2().where = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ size: 0, docs: [], empty: true }),
      });

      const result = await unifiedTestEngine.startTestAttempt('test-1', mockStudentId);
      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
    });
  });

  describe('submitTestAttempt', () => {
    it('should submit and grade a test attempt', async () => {
      const { collections } = require('../database/adapter');

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

      const attemptDoc = {
        exists: true,
        data: () => attemptData,
        id: 'attempt-1',
      };

      const testDoc = {
        exists: true,
        data: () => testData,
        id: 'test-1',
      };

      collections.quizAttemptV2.mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(attemptDoc),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
        where: () => ({ get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }) }),
        firestore: { batch: () => ({ update: jest.fn(), delete: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }) },
      });

      collections.quizV2.mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(testDoc),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
        where: () => ({ get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }) }),
        firestore: { batch: () => ({ update: jest.fn(), delete: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }) },
      });

      collections.users.mockReturnValue({
        doc: () => ({
          update: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ level: 'beginner' }) }),
        }),
        where: () => ({ get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }) }),
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
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'test-1', showResults: true }),
        id: 'test-1',
      });

      const result = await unifiedTestEngine.getTestResults('test-1', mockStudentId, true);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('releaseResults', () => {
    it('should toggle results visibility', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'test-1', teacherId: mockTeacherId }),
        id: 'test-1',
      });

      const result = await unifiedTestEngine.releaseResults('test-1', true, mockTeacherId);
      expect(result).toBeDefined();
    });
  });

  describe('deleteTest', () => {
    it('should delete a test with cascade', async () => {
      const { collections } = require('../database/adapter');
      collections.quizV2().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'test-1', teacherId: mockTeacherId }),
        id: 'test-1',
      });

      await expect(unifiedTestEngine.deleteTest('test-1', mockTeacherId)).resolves.not.toThrow();
    });
  });
});
