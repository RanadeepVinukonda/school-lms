import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const genData: any = {};
function makeDoc(ref: any) {
  return {
    exists: true, id: 'mock-id',
    data: () => ref.current,
    get: () => Promise.resolve({ exists: true, data: () => ref.current, id: 'mock-id' }),
    set: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    update: (d: any) => { ref.current = { ...ref.current, ...d }; return Promise.resolve(); },
    delete: () => Promise.resolve(),
  };
}
const theDoc = makeDoc(genData);
const countSnap = { data: () => ({ count: 5 }) };
function chainable() {
  const c: any = {
    where: () => c, orderBy: () => c, limit: () => c, offset: () => c,
    count: () => ({ get: () => Promise.resolve(countSnap) }),
    get: () => Promise.resolve({ empty: false, docs: [theDoc], size: 1, forEach: (cb: Function) => cb(theDoc) }),
  };
  return c;
}
const baseCollection: any = {
  doc: () => theDoc,
  get: () => Promise.resolve({ empty: false, docs: [theDoc], size: 1, forEach: (cb: Function) => cb(theDoc) }),
  where: () => chainable(),
  orderBy: () => chainable(),
  limit: () => chainable(),
  firestore: { batch: () => ({ set: () => {}, update: () => {}, create: () => {}, delete: () => {}, commit: () => Promise.resolve() }) },
};

jest.mock('../database/adapter', () => ({
  FieldValue: { increment: (n: number) => n, arrayUnion: (...args: any[]) => args, arrayRemove: (...args: any[]) => args, serverTimestamp: () => new Date(), deleteField: () => undefined },
  collections: {
    academicYears: jest.fn(), classes: jest.fn(), subjects: jest.fn(),
    courses: jest.fn(), exams: jest.fn(), quizzes: jest.fn(),
    textbooks: jest.fn(), lessons: jest.fn(),
    settings: jest.fn(),
    teacherClassSubject: jest.fn(),
  },
  getDb: jest.fn(() => ({ collection: jest.fn(() => baseCollection), batch: jest.fn(() => ({ commit: () => Promise.resolve() })) })),
}));
jest.mock('../services/notification.service', () => ({ createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })), createBulkNotifications: jest.fn(() => Promise.resolve([])) }));
jest.mock('../services/course.service', () => ({ getEnrollments: jest.fn(() => Promise.resolve([])), createCourse: jest.fn(() => Promise.resolve({ id: 'c1' })) }));
jest.mock('../jobs/queue', () => ({ addUploadJob: jest.fn(() => Promise.resolve()), removeUploadJob: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/studentIdGenerator.js', () => ({ generateStudentId: jest.fn(() => 'STU001') }));
jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = { insert: () => chain, select: () => chain, eq: () => chain, limit: () => chain, order: () => chain, single: () => Promise.resolve({ data: null }), error: null, data: null };
    return { auth: { getUser: jest.fn() }, from: jest.fn(() => chain) };
  }),
}));

import * as academicYearService from '../services/academic-year.service';
import * as classService from '../services/class.service';
import * as courseService from '../services/course.service';
import * as examService from '../services/exam.service';
import * as quizService from '../services/quiz.service';
import * as textbookService from '../services/textbook.service';
import { collections } from '../database/adapter';

function mockAllCollections() {
  (collections.academicYears as jest.Mock).mockReturnValue(baseCollection);
  (collections.classes as jest.Mock).mockReturnValue(baseCollection);
  (collections.subjects as jest.Mock).mockReturnValue(baseCollection);
  (collections.courses as jest.Mock).mockReturnValue(baseCollection);
  (collections.exams as jest.Mock).mockReturnValue(baseCollection);
  (collections.quizzes as jest.Mock).mockReturnValue(baseCollection);
  (collections.textbooks as jest.Mock).mockReturnValue(baseCollection);
  (collections.lessons as jest.Mock).mockReturnValue(baseCollection);
  (collections.settings as jest.Mock).mockReturnValue(baseCollection);
  (collections.teacherClassSubject as jest.Mock).mockReturnValue(baseCollection);
}

beforeEach(() => {
  mockAllCollections();
  genData.current = {};
});

describe('AcademicYearService', () => {
  beforeEach(() => {
    const emptyQ = { where: () => emptyQ, limit: () => emptyQ, get: () => Promise.resolve({ empty: true, docs: [], forEach: () => {} }) };
    (collections.academicYears as jest.Mock).mockReturnValue({ ...baseCollection, where: () => emptyQ });
  });
  it('creates academic year', async () => {
    const result = await academicYearService.createAcademicYear({ name: '2025', code: '25', startDate: new Date().toISOString(), endDate: new Date().toISOString(), isCurrent: true });
    expect(result).toBeDefined();
    expect(result.name).toBe('2025');
  });
  it('lists academic years', async () => {
    const result = await academicYearService.listAcademicYears({});
    expect(result.items).toBeDefined();
  });
  it('gets current academic year', async () => {
    genData.current = { name: '2025', isCurrent: true };
    const qc: any = { where: () => qc, limit: () => qc, get: () => Promise.resolve({ empty: false, docs: [theDoc], forEach: (cb: Function) => cb(theDoc) }) };
    (collections.academicYears as jest.Mock).mockReturnValue({ doc: () => theDoc, where: () => qc });
    const result = await academicYearService.getCurrentAcademicYear();
    expect(result).not.toBeNull();
  });
  it('deletes non-current academic year', async () => {
    genData.current = { name: '2024', code: '24', isCurrent: false, status: 'inactive' };
    await expect(academicYearService.deleteAcademicYear('y2')).resolves.not.toThrow();
  });
});

describe('ClassService', () => {
  it('creates class', async () => {
    const result = await classService.createClass({ name: 'Grade 10A', code: 'G10A', grade: '10' });
    expect(result).toBeDefined();
  });
  it('lists classes', async () => {
    const result = await classService.listClasses({});
    expect(result.items).toBeDefined();
  });
  it('gets class by id', async () => {
    genData.current = { name: 'Class A' };
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
    const result = await quizService.listAllQuizzes({ page: '1', limit: '10' });
    expect(result.items).toBeDefined();
  });
});

describe('TextbookService', () => {
  it('creates textbook', async () => {
    const result = await textbookService.createTextbook({ title: 'Algebra', subjectId: 's1', grade: '10' } as any);
    expect(result).toBeDefined();
  });
});
