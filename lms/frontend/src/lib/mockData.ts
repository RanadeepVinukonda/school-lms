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
    id: 'tb1', subjectId: 'sub1', title: 'Algebra Fundamentals', coverUrl: '', description: 'M1 – Linear equations, quadratics, and polynomials', chapters: [
      { id: 'ch1', title: 'Linear Equations', order: 1, lessonCount: 3 },
      { id: 'ch2', title: 'Quadratic Functions', order: 2, lessonCount: 2 },
      { id: 'ch3', title: 'Polynomials', order: 3, lessonCount: 2 },
    ],
  },
  {
    id: 'tb2', subjectId: 'sub1', title: 'Geometry & Trigonometry', coverUrl: '', description: 'M2 – Shapes, angles, and trigonometric functions', chapters: [
      { id: 'ch8', title: 'Triangles & Theorems', order: 1, lessonCount: 3 },
      { id: 'ch9', title: 'Trigonometric Ratios', order: 2, lessonCount: 2 },
    ],
  },
  {
    id: 'tb3', subjectId: 'sub2', title: 'Mechanics & Motion', coverUrl: '', description: 'Introduction to classical mechanics', chapters: [
      { id: 'ch4', title: 'Newton\'s Laws', order: 1, lessonCount: 3 },
      { id: 'ch5', title: 'Energy & Work', order: 2, lessonCount: 2 },
    ],
  },
  {
    id: 'tb4', subjectId: 'sub3', title: 'English Grammar & Composition', coverUrl: '', description: 'Master English writing and grammar', chapters: [
      { id: 'ch6', title: 'Essay Writing', order: 1, lessonCount: 2 },
      { id: 'ch7', title: 'Poetry Analysis', order: 2, lessonCount: 2 },
    ],
  },
];

export const mockLessons = [
  { id: 'l1', textbookId: 'tb1', chapterId: 'ch1', title: 'Solving Linear Equations', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 15, order: 1, quizId: 'q1', assignmentId: 'a1' },
  { id: 'l2', textbookId: 'tb1', chapterId: 'ch1', title: 'Graphing Linear Functions', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 20, order: 2, quizId: 'q5', assignmentId: undefined },
  { id: 'l3', textbookId: 'tb1', chapterId: 'ch1', title: 'Systems of Equations', contentType: 'article', content: 'When two or more equations share variables...', duration: 25, order: 3, quizId: undefined, assignmentId: 'a2' },
  { id: 'l4', textbookId: 'tb1', chapterId: 'ch2', title: 'Intro to Quadratics', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 18, order: 1, quizId: 'q6', assignmentId: undefined },
  { id: 'l5', textbookId: 'tb1', chapterId: 'ch2', title: 'Quadratic Formula', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 22, order: 2 },
  { id: 'l6', textbookId: 'tb1', chapterId: 'ch3', title: 'Polynomial Operations', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 16, order: 1, assignmentId: 'a6' },
  { id: 'l7', textbookId: 'tb1', chapterId: 'ch3', title: 'Factoring Polynomials', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 19, order: 2 },
  { id: 'l8', textbookId: 'tb2', chapterId: 'ch8', title: 'Pythagorean Theorem', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 14, order: 1, quizId: 'q7', assignmentId: 'a3' },
  { id: 'l9', textbookId: 'tb2', chapterId: 'ch8', title: 'Congruent Triangles', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 17, order: 2 },
  { id: 'l10', textbookId: 'tb2', chapterId: 'ch8', title: 'Similar Triangles', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 21, order: 3 },
  { id: 'l11', textbookId: 'tb2', chapterId: 'ch9', title: 'Sine, Cosine & Tangent', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 25, order: 1, quizId: 'q8', assignmentId: 'a7' },
  { id: 'l12', textbookId: 'tb2', chapterId: 'ch9', title: 'Solving Triangles', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 20, order: 2 },
  { id: 'l13', textbookId: 'tb3', chapterId: 'ch4', title: 'Newton\'s First Law', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 12, order: 1, quizId: 'q2' },
  { id: 'l14', textbookId: 'tb3', chapterId: 'ch4', title: 'Newton\'s Second Law', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 15, order: 2, assignmentId: 'a4' },
  { id: 'l15', textbookId: 'tb3', chapterId: 'ch4', title: 'Newton\'s Third Law', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 13, order: 3 },
  { id: 'l16', textbookId: 'tb3', chapterId: 'ch5', title: 'Kinetic & Potential Energy', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 18, order: 1 },
  { id: 'l17', textbookId: 'tb3', chapterId: 'ch5', title: 'Work-Energy Theorem', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 20, order: 2 },
  { id: 'l18', textbookId: 'tb4', chapterId: 'ch6', title: 'Essay Structure', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, order: 1, assignmentId: 'a5' },
  { id: 'l19', textbookId: 'tb4', chapterId: 'ch6', title: 'Thesis Statements', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 12, order: 2 },
  { id: 'l20', textbookId: 'tb4', chapterId: 'ch7', title: 'Reading Poetry', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 15, order: 1, quizId: 'q9' },
  { id: 'l21', textbookId: 'tb4', chapterId: 'ch7', title: 'Writing About Poems', contentType: 'video', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 18, order: 2, assignmentId: 'a8' },
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
  { id: 'a1', title: 'Linear Equations Worksheet', lessonId: 'l1', chapterId: 'ch1', textbookId: 'tb1', description: 'Solve 20 linear equations', dueDate: day(7), maxPoints: 100, status: 'published' as const, submissionCount: 0 },
  { id: 'a2', title: 'Systems of Equations Practice', lessonId: 'l3', chapterId: 'ch1', textbookId: 'tb1', description: 'Solve 5 systems of equations', dueDate: day(10), maxPoints: 50, status: 'published' as const, submissionCount: 0 },
  { id: 'a3', title: 'Triangle Proofs Homework', lessonId: 'l8', chapterId: 'ch8', textbookId: 'tb2', description: 'Prove 3 triangle theorems', dueDate: day(14), maxPoints: 75, status: 'published' as const, submissionCount: 0 },
  { id: 'a4', title: 'Newton\'s Law Lab Report', lessonId: 'l14', chapterId: 'ch4', textbookId: 'tb3', description: 'Write lab report on inertia experiments', dueDate: day(10), maxPoints: 100, status: 'published' as const, submissionCount: 0 },
  { id: 'a5', title: 'Essay Draft', lessonId: 'l18', chapterId: 'ch6', textbookId: 'tb4', description: 'Submit first draft of your essay', dueDate: day(-2), maxPoints: 50, status: 'published' as const, submissionCount: 0 },
  { id: 'a6', title: 'Polynomial Operations Set', lessonId: 'l6', chapterId: 'ch3', textbookId: 'tb1', description: 'Complete polynomial operations', dueDate: day(21), maxPoints: 80, status: 'published' as const, submissionCount: 0 },
  { id: 'a7', title: 'Trig Ratios Worksheet', lessonId: 'l11', chapterId: 'ch9', textbookId: 'tb2', description: 'Calculate sine, cosine, and tangent', dueDate: day(28), maxPoints: 60, status: 'published' as const, submissionCount: 0 },
  { id: 'a8', title: 'Poetry Analysis Paper', lessonId: 'l21', chapterId: 'ch7', textbookId: 'tb4', description: 'Write a 2-page analysis of a poem', dueDate: day(35), maxPoints: 100, status: 'published' as const, submissionCount: 0 },
];

export const mockQuizzes = [
  { id: 'q1', title: 'Linear Equations Quiz', lessonId: 'l1', chapterId: 'ch1', textbookId: 'tb1', description: 'Test your algebra skills', timeLimit: 30, questions: [
    { id: 'qq1', type: 'multiple_choice', question: 'What is the slope of y = 2x + 3?', options: ['2', '3', '-2', '0'], correctAnswer: '2', points: 10 },
    { id: 'qq2', type: 'multiple_choice', question: 'Solve: 3x + 7 = 22', options: ['x=5', 'x=7', 'x=3', 'x=15'], correctAnswer: 'x=5', points: 10 },
  ], status: 'published' as const },
  { id: 'q2', title: 'Newton\'s Laws Quiz', lessonId: 'l13', chapterId: 'ch4', textbookId: 'tb3', description: 'Test physics knowledge', timeLimit: 20, questions: [
    { id: 'qq3', type: 'multiple_choice', question: 'An object at rest stays at rest unless...', options: ['acted upon by a force', 'it is heavy', 'it is light', 'it moves'], correctAnswer: 'acted upon by a force', points: 10 },
  ], status: 'published' as const },
  { id: 'q5', title: 'Graphing Functions Quiz', lessonId: 'l2', chapterId: 'ch1', textbookId: 'tb1', description: 'Test graphing skills', timeLimit: 15, questions: [
    { id: 'qq5', type: 'multiple_choice', question: 'What shape is y = x²?', options: ['Parabola', 'Line', 'Circle', 'Hyperbola'], correctAnswer: 'Parabola', points: 10 },
  ], status: 'published' as const },
  { id: 'q6', title: 'Quadratics Quick Check', lessonId: 'l4', chapterId: 'ch2', textbookId: 'tb1', description: 'Quick quadratic functions quiz', timeLimit: 10, questions: [
    { id: 'qq6', type: 'multiple_choice', question: 'How many solutions can a quadratic have?', options: ['0, 1, or 2', 'Always 2', 'Always 1', 'None'], correctAnswer: '0, 1, or 2', points: 10 },
  ], status: 'published' as const },
  { id: 'q7', title: 'Pythagorean Theorem Quiz', lessonId: 'l8', chapterId: 'ch8', textbookId: 'tb2', description: 'Test your geometry knowledge', timeLimit: 20, questions: [
    { id: 'qq7', type: 'multiple_choice', question: 'In a right triangle, a² + b² = ?', options: ['c²', '2c', 'c', 'c/2'], correctAnswer: 'c²', points: 10 },
  ], status: 'published' as const },
  { id: 'q8', title: 'Trig Ratios Quiz', lessonId: 'l11', chapterId: 'ch9', textbookId: 'tb2', description: 'Sine, cosine, and tangent', timeLimit: 25, questions: [
    { id: 'qq8', type: 'multiple_choice', question: 'sin(θ) = ?', options: ['opposite/hypotenuse', 'adjacent/hypotenuse', 'opposite/adjacent', 'hypotenuse/opposite'], correctAnswer: 'opposite/hypotenuse', points: 10 },
  ], status: 'published' as const },
  { id: 'q9', title: 'Poetry Terms Quiz', lessonId: 'l20', chapterId: 'ch7', textbookId: 'tb4', description: 'Match poetic devices to definitions', timeLimit: 15, questions: [
    { id: 'qq9', type: 'multiple_choice', question: 'What is a metaphor?', options: ['A comparison without like/as', 'A comparison using like/as', 'A rhyme scheme', 'A type of poem'], correctAnswer: 'A comparison without like/as', points: 10 },
  ], status: 'published' as const },
];

export const mockExams = [
  { id: 'e1', title: 'Midterm Examination', subjectId: 'sub1', description: 'Covers chapters 1-3', timeLimit: 120, questions: [
    { id: 'eq1', type: 'multiple_choice', question: 'What is the quadratic formula?', options: ['x = (-b ± √(b²-4ac))/2a', 'x = b²-4ac', 'x = -b/2a', 'None'], correctAnswer: 'x = (-b ± √(b²-4ac))/2a', points: 20 },
    { id: 'eq2', type: 'essay', question: 'Explain how to complete the square.', points: 30 },
  ], status: 'published' as const, startDate: day(30), endDate: day(31) },
  { id: 'e2', title: 'Physics Final', subjectId: 'sub2', description: 'Comprehensive physics exam', timeLimit: 180, questions: [
    { id: 'eq3', type: 'multiple_choice', question: 'What is the unit of force?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correctAnswer: 'Newton', points: 10 },
    { id: 'eq4', type: 'essay', question: 'Describe the law of conservation of energy.', points: 40 },
  ], status: 'published' as const, startDate: day(60), endDate: day(61) },
];

export const mockGrades = [
  { id: 'g1', studentId: 's1', subjectId: 'sub1', itemId: 'a1', type: 'assignment' as const, itemName: mockAssignments[0].title, score: 85, maxScore: 100, percentage: 85, gradedAt: day(-1) },
  { id: 'g2', studentId: 's1', subjectId: 'sub3', itemId: 'a5', type: 'assignment' as const, itemName: mockAssignments[4].title, score: 42, maxScore: 50, percentage: 84, gradedAt: day(-1) },
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
