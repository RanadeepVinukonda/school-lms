import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));
jest.mock('../services/notification.service', () => ({ createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })), createBulkNotifications: jest.fn(() => Promise.resolve([])) }));
jest.mock('../services/course.service', () => ({ getEnrollments: jest.fn(() => Promise.resolve([])), createCourse: jest.fn(() => Promise.resolve({ id: 'c1' })) }));
jest.mock('../jobs/queue', () => ({ addUploadJob: jest.fn(() => Promise.resolve()), removeUploadJob: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/studentIdGenerator.js', () => ({ generateStudentId: jest.fn(() => 'STU001') }));

import * as academicYearService from '../services/academic-year.service';
import * as classService from '../services/class.service';
import * as courseService from '../services/course.service';
import * as examService from '../services/exam.service';
import * as quizService from '../services/quiz.service';
import * as textbookService from '../services/textbook.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  (mockQuery.single as any).mockReset();
  (mockQuery.maybeSingle as any).mockReset();
  mockQuery.single.mockResolvedValue(({ data: null, error: null }) as any);
  mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
});

describe('AcademicYearService', () => {
  it('creates academic year', async () => {
    // maybeSingle returns null (no existing code conflict) → creates new
    const result = await academicYearService.createAcademicYear({ name: '2025', code: '25', startDate: new Date().toISOString(), endDate: new Date().toISOString(), isCurrent: true });
    expect(result).toBeDefined();
    expect(result.name).toBe('2025');
  });
  it('lists academic years', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 0;
    const result = await academicYearService.listAcademicYears({});
    expect(result.items).toBeDefined();
  });
  it('gets current academic year', async () => {
    const now = new Date().toISOString();
    (mockQuery as any).data = [{ doc_id: 'y1', data: { name: '2025', isCurrent: true, startDate: now, endDate: now } }];
    const result = await academicYearService.getCurrentAcademicYear();
    expect(result).not.toBeNull();
  });
  it('deletes non-current academic year', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'y2', data: { name: '2024', code: '24', isCurrent: false, status: 'inactive' } }, error: null }) as any);
    await expect(academicYearService.deleteAcademicYear('y2')).resolves.not.toThrow();
  });
});

describe('ClassService', () => {
  it('creates class', async () => {
    const result = await classService.createClass({ name: 'Grade 10A', code: 'G10A', grade: '10' });
    expect(result).toBeDefined();
  });
  it('lists classes', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 0;
    const result = await classService.listClasses({});
    expect(result.items).toBeDefined();
  });
  it('gets class by id', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { name: 'Class A' }, error: null }) as any);
    const result = await classService.getClassById('c1');
    expect(result.name).toBe('Class A');
  });
});

describe('CourseService', () => {
  it('creates course', async () => {
    const result = await courseService.createCourse({ name: 'Math', code: 'MATH', classId: 'c1' } as any);
    expect(result).toBeDefined();
  });
});

describe('ExamService', () => {
  it('creates exam', async () => {
    const result = await examService.createExam({ title: 'Midterm', courseId: 'c1', questions: [{ questionText: 'Q1', options: ['A', 'B'], correctAnswer: 'A', points: 1, type: 'mcq' }], timeLimit: 60, passingScore: 40 });
    expect(result.title).toBe('Midterm');
  });
  it('lists exams', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 0;
    const result = await examService.listAllExams({ page: '1', limit: '10' });
    expect(result.items).toBeDefined();
  });
});

describe('QuizService', () => {
  it('creates quiz', async () => {
    const result = await quizService.createQuiz({ title: 'Pop Quiz', courseId: 'c1', questions: [{ questionText: 'Q1', options: ['A', 'B'], correctAnswer: 'A', points: 1, type: 'mcq' }] });
    expect(result.title).toBe('Pop Quiz');
  });
  it('lists quizzes', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 0;
    const result = await quizService.listAllQuizzes({ page: '1', limit: '10' });
    expect(result.items).toBeDefined();
  });
});

describe('TextbookService', () => {
  it('creates textbook', async () => {
    (mockQuery as any).data = [{ doc_id: 'a1', data: { teacherId: 't1', classId: 'c1', subjectId: 's1' } }];
    (mockQuery as any).count = 0;
    const result = await textbookService.createTextbook({ title: 'Algebra', subjectId: 's1', classId: 'c1', teacherId: 't1' } as any);
    expect(result).toBeDefined();
  });
});
