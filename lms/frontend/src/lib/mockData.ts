const now = new Date();
const day = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

export const mockUsers = {
  student1: { id: 's1', email: 'alice@genesis.edu', displayName: 'Alice Johnson', role: 'student' as const, studentId: 'STU001', classId: 'c1', avatar: '' },
  student2: { id: 's2', email: 'bob@genesis.edu', displayName: 'Bob Smith', role: 'student' as const, studentId: 'STU002', classId: 'c1', avatar: '' },
  student3: { id: 's3', email: 'carol@genesis.edu', displayName: 'Carol Davis', role: 'student' as const, studentId: 'STU003', classId: 'c2', avatar: '' },
  teacher1: { id: 't1', email: 'dr.wilson@genesis.edu', displayName: 'Dr. Wilson', role: 'teacher' as const, teacherId: 'TCH001', avatar: '' },
  teacher2: { id: 't2', email: 'ms.parker@genesis.edu', displayName: 'Ms. Parker', role: 'teacher' as const, teacherId: 'TCH002', avatar: '' },
  admin:   { id: 'a1', email: 'admin@genesis.edu', displayName: 'Principal Adams', role: 'admin' as const, avatar: '' },
};

export const mockClasses = [
  { id: 'c1', name: 'Grade 10A', code: '10A', grade: '10', classTeacherId: 't1', studentCount: 30, subjectIds: ['sub1', 'sub2', 'sub3'] },
  { id: 'c2', name: 'Grade 10B', code: '10B', grade: '10', classTeacherId: 't2', studentCount: 28, subjectIds: ['sub1', 'sub2', 'sub3'] },
];

export const mockSubjects = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH10', icon: 'calculate', color: '#3B82F6', category: 'STEM' },
  { id: 'sub2', name: 'Physics', code: 'PHY10', icon: 'science', color: '#8B5CF6', category: 'STEM' },
  { id: 'sub3', name: 'English Literature', code: 'ENG10', icon: 'menu_book', color: '#EC4899', category: 'Humanities' },
  { id: 'sub4', name: 'World History', code: 'HIS10', icon: 'history', color: '#F59E0B', category: 'Humanities' },
];

export const mockTextbooks = [
  {
    id: 'tb1', subjectId: 'sub1', title: 'Algebra Fundamentals', coverUrl: '', description: 'Comprehensive algebra course for Grade 10', chapters: [
      { id: 'ch1', title: 'Linear Equations', order: 1, lessonCount: 3 },
      { id: 'ch2', title: 'Quadratic Functions', order: 2, lessonCount: 2 },
      { id: 'ch3', title: 'Polynomials', order: 3, lessonCount: 2 },
    ],
  },
  {
    id: 'tb2', subjectId: 'sub2', title: 'Mechanics & Motion', coverUrl: '', description: 'Introduction to classical mechanics', chapters: [
      { id: 'ch4', title: 'Newton\'s Laws', order: 1, lessonCount: 3 },
      { id: 'ch5', title: 'Energy & Work', order: 2, lessonCount: 2 },
    ],
  },
  {
    id: 'tb3', subjectId: 'sub3', title: 'English Grammar & Composition', coverUrl: '', description: 'Master English writing and grammar', chapters: [
      { id: 'ch6', title: 'Essay Writing', order: 1, lessonCount: 2 },
      { id: 'ch7', title: 'Poetry Analysis', order: 2, lessonCount: 2 },
    ],
  },
];

export const mockLessons = [
  { id: 'l1', textbookId: 'tb1', chapterId: 'ch1', title: 'Solving Linear Equations', contentType: 'video', videoUrl: '', duration: 15, order: 1 },
  { id: 'l2', textbookId: 'tb1', chapterId: 'ch1', title: 'Graphing Linear Functions', contentType: 'video', videoUrl: '', duration: 20, order: 2 },
  { id: 'l3', textbookId: 'tb1', chapterId: 'ch1', title: 'Systems of Equations', contentType: 'article', content: 'When two or more equations share variables...', duration: 25, order: 3 },
  { id: 'l4', textbookId: 'tb1', chapterId: 'ch2', title: 'Intro to Quadratics', contentType: 'video', videoUrl: '', duration: 18, order: 1 },
  { id: 'l5', textbookId: 'tb2', chapterId: 'ch4', title: 'Newton\'s First Law', contentType: 'video', videoUrl: '', duration: 12, order: 1 },
];

export const mockEnrollments = [
  { studentId: 's1', subjectId: 'sub1', status: 'active', progress: 65 },
  { studentId: 's1', subjectId: 'sub2', status: 'active', progress: 40 },
  { studentId: 's1', subjectId: 'sub3', status: 'active', progress: 80 },
  { studentId: 's2', subjectId: 'sub1', status: 'active', progress: 45 },
  { studentId: 's2', subjectId: 'sub2', status: 'active', progress: 70 },
  { studentId: 's3', subjectId: 'sub1', status: 'active', progress: 90 },
];

export const mockAssignments = [
  { id: 'a1', title: 'Linear Equations Worksheet', courseId: 'sub1', chapterId: 'ch1', textbookId: 'tb1', description: 'Solve 20 linear equations', dueDate: day(7), maxPoints: 100, status: 'published' as const, submissionCount: 0 },
  { id: 'a2', title: 'Graphing Practice', courseId: 'sub1', chapterId: 'ch1', textbookId: 'tb1', description: 'Graph 10 functions', dueDate: day(14), maxPoints: 50, status: 'published' as const, submissionCount: 0 },
  { id: 'a3', title: 'Newton\'s Law Lab Report', courseId: 'sub2', chapterId: 'ch4', textbookId: 'tb2', description: 'Write lab report on inertia experiments', dueDate: day(10), maxPoints: 100, status: 'published' as const, submissionCount: 0 },
  { id: 'a4', title: 'Essay Draft', courseId: 'sub3', chapterId: 'ch6', textbookId: 'tb3', description: 'Submit first draft of your essay', dueDate: day(-2), maxPoints: 50, status: 'published' as const, submissionCount: 0 },
];

export const mockQuizzes = [
  { id: 'q1', title: 'Linear Equations Quiz', courseId: 'sub1', chapterId: 'ch1', textbookId: 'tb1', description: 'Test your algebra skills', timeLimit: 30, questions: [
    { id: 'qq1', type: 'multiple_choice', question: 'What is the slope of y = 2x + 3?', options: ['2', '3', '-2', '0'], correctAnswer: '2', points: 10 },
    { id: 'qq2', type: 'multiple_choice', question: 'Solve: 3x + 7 = 22', options: ['x=5', 'x=7', 'x=3', 'x=15'], correctAnswer: 'x=5', points: 10 },
  ], status: 'published' as const },
  { id: 'q2', title: 'Newton\'s Laws Quiz', courseId: 'sub2', chapterId: 'ch4', textbookId: 'tb2', description: 'Test physics knowledge', timeLimit: 20, questions: [
    { id: 'qq3', type: 'multiple_choice', question: 'An object at rest stays at rest unless...', options: ['acted upon by a force', 'it is heavy', 'it is light', 'it moves'], correctAnswer: 'acted upon by a force', points: 10 },
  ], status: 'published' as const },
];

export const mockExams = [
  { id: 'e1', title: 'Midterm Examination', courseId: 'sub1', description: 'Covers chapters 1-3', timeLimit: 120, questions: [
    { id: 'eq1', type: 'multiple_choice', question: 'What is the quadratic formula?', options: ['x = (-b ± √(b²-4ac))/2a', 'x = b²-4ac', 'x = -b/2a', 'None'], correctAnswer: 'x = (-b ± √(b²-4ac))/2a', points: 20 },
    { id: 'eq2', type: 'essay', question: 'Explain how to complete the square.', points: 30 },
  ], status: 'published' as const, startDate: day(30), endDate: day(31) },
  { id: 'e2', title: 'Physics Final', courseId: 'sub2', description: 'Comprehensive physics exam', timeLimit: 180, questions: [
    { id: 'eq3', type: 'multiple_choice', question: 'What is the unit of force?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correctAnswer: 'Newton', points: 10 },
    { id: 'eq4', type: 'essay', question: 'Describe the law of conservation of energy.', points: 40 },
  ], status: 'published' as const, startDate: day(60), endDate: day(61) },
];

export const mockGrades = [
  { id: 'g1', studentId: 's1', courseId: 'sub1', itemId: 'a1', type: 'assignment' as const, itemName: mockAssignments[0].title, score: 85, maxScore: 100, percentage: 85, gradedAt: day(-1) },
  { id: 'g2', studentId: 's1', courseId: 'sub3', itemId: 'a4', type: 'assignment' as const, itemName: mockAssignments[3].title, score: 42, maxScore: 50, percentage: 84, gradedAt: day(-1) },
];

export const mockSubmissions = [
  { id: 'sub1', assignmentId: 'a4', studentId: 's1', content: 'My essay about Shakespeare...', submittedAt: day(-3), status: 'graded' as const, grade: 42, feedback: 'Good structure, needs more analysis.' },
];

export const mockTimetable = [
  { id: 'tt1', classId: 'c1', day: 'monday' as const, period: 1, subjectId: 'sub1', teacherId: 't1', room: '101' },
  { id: 'tt2', classId: 'c1', day: 'monday' as const, period: 2, subjectId: 'sub2', teacherId: 't1', room: '102' },
  { id: 'tt3', classId: 'c1', day: 'tuesday' as const, period: 1, subjectId: 'sub3', teacherId: 't2', room: '201' },
  { id: 'tt4', classId: 'c1', day: 'tuesday' as const, period: 2, subjectId: 'sub2', teacherId: 't1', room: '102' },
  { id: 'tt5', classId: 'c1', day: 'wednesday' as const, period: 1, subjectId: 'sub1', teacherId: 't1', room: '101' },
  { id: 'tt6', classId: 'c1', day: 'thursday' as const, period: 1, subjectId: 'sub3', teacherId: 't2', room: '201' },
  { id: 'tt7', classId: 'c1', day: 'friday' as const, period: 1, subjectId: 'sub1', teacherId: 't1', room: '101' },
];

export const mockCorrections = [
  { id: 'cr1', examId: 'e1', studentId: 's1', teacherId: 't1', questionMarks: [{ questionId: 'eq1', marks: 18, feedback: 'Correct formula, minor calculation error' }, { questionId: 'eq2', marks: 25, feedback: 'Good explanation' }], totalMarks: 43, overallFeedback: 'Well done overall. Practice more on completing the square.', status: 'published' as const, correctedAt: day(-5) },
];

export const mockNotifications = [
  { id: 'n1', recipientId: 's1', type: 'assignment' as const, title: 'New Assignment Posted', message: 'Linear Equations Worksheet is due in 7 days', link: '/assignments/a1', read: false, createdAt: day(-1) },
  { id: 'n2', recipientId: 's1', type: 'grade' as const, title: 'Grade Published', message: 'Your essay draft has been graded: 42/50', link: '/assignments/a4', read: false, createdAt: day(-2) },
  { id: 'n3', recipientId: 's1', type: 'exam' as const, title: 'Upcoming Exam', message: 'Midterm Examination starts in 30 days', link: '/exams/e1', read: true, createdAt: day(-7) },
  { id: 'n4', recipientId: 't1', type: 'submission' as const, title: 'New Submission', message: 'Alice submitted her Linear Equations Worksheet', link: '/assignments/a1', read: false, createdAt: day(0) },
];

export const mockConversations = [
  { id: 'conv1', participants: ['s1', 't1'], lastMessage: 'When is the next class?', subject: 'Office Hours', unreadCount: 1, createdAt: day(-1) },
];
export const mockMessages = [
  { id: 'm1', conversationId: 'conv1', senderId: 's1', content: 'When is the next class?', sentAt: day(-1) },
  { id: 'm2', conversationId: 'conv1', senderId: 't1', content: 'Tomorrow at 10 AM', sentAt: day(0) },
];

export const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export const periods = [1, 2, 3, 4, 5, 6, 7, 8];
