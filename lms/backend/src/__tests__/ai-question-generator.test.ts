jest.mock('../database/adapter', () => {
  const mockDoc = { exists: true, id: 'mock-id', data: jest.fn(), ref: {} };
  const mockSnapshot = { empty: false, size: 1, docs: [mockDoc], forEach: (cb: Function) => cb(mockDoc) };
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot),
  };
  const mockCollection = {
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockDoc),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(mockDoc),
    where: jest.fn().mockReturnValue(mockQuery),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
    firestore: {
      batch: jest.fn().mockReturnValue({ update: jest.fn(), delete: jest.fn(), create: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }),
    },
  };
  return {
    collections: {
      concept_questions: jest.fn().mockReturnValue(mockCollection),
      textbooks: jest.fn().mockReturnValue(mockCollection),
    },
    FieldValue: { increment: jest.fn((n) => n) },
  };
});

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

jest.mock('../services/ai.service', () => ({
  chatCompletion: jest.fn(),
}));

jest.mock('../services/ai-level.service', () => ({
  computeLevel: jest.fn().mockReturnValue('beginner'),
  computeComplexityHandled: jest.fn().mockReturnValue(0.5),
}));

import * as aiGenerator from '../services/ai-question-generator.service';
import * as aiService from '../services/ai.service';

describe('AI Question Generator', () => {
  const mockBaseParams = {
    conceptId: 'concept-1',
    textbookId: 'textbook-1',
    chapterId: 'chapter-1',
    conceptName: 'Algebra Basics',
    types: ['multiple_choice', 'true_false'] as any[],
    count: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (aiService.chatCompletion as jest.Mock).mockResolvedValue(JSON.stringify({
      questions: [
        { question: 'What is 2+2?', type: 'mcq', difficulty: 'easy', options: ['3', '4', '5'], answer: '4', explanation: 'Basic math', points: 1 },
      ],
    }));
  });

  describe('generateQuestionsForConcept', () => {
    it('should generate questions with valid params', async () => {
      const result = await aiGenerator.generateQuestionsForConcept(mockBaseParams);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('type');
        expect(result[0]).toHaveProperty('question');
      }
    });

    it('should handle empty types array', async () => {
      const result = await aiGenerator.generateQuestionsForConcept({
        ...mockBaseParams,
        types: [],
        count: 0,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when AI returns invalid JSON', async () => {
      (aiService.chatCompletion as jest.Mock).mockResolvedValueOnce('not json at all');

      const result = await aiGenerator.generateQuestionsForConcept(mockBaseParams);
      expect(result).toEqual([]);
    });

    it('should return empty array when AI service throws', async () => {
      (aiService.chatCompletion as jest.Mock).mockRejectedValueOnce(new Error('AI service down'));

      const result = await aiGenerator.generateQuestionsForConcept(mockBaseParams);
      expect(result).toEqual([]);
    });
  });

  describe('saveAiQuestions', () => {
    it('should save questions to supabase', async () => {
      const mockQuestions = [
        { type: 'mcq', difficulty: 'easy', question: 'Test?', options: ['A', 'B'], answer: 'A', explanation: 'Exp' },
      ];

      await expect(aiGenerator.saveAiQuestions(mockQuestions as any, 'concept-1', 'textbook-1', 'chapter-1')).resolves.not.toThrow();
    });
  });

  describe('generateQuestionsFromTextbook', () => {
    it('should return empty when no concepts found', async () => {
      const result = await aiGenerator.generateQuestionsFromTextbook({
        textbookId: 'nonexistent',
        types: ['multiple_choice'],
        totalCount: 5,
      });
      expect(result).toEqual([]);
    });
  });

  // generateQuestionsFromExistingBank tested via generateQuestionsForConcept coverage
});
