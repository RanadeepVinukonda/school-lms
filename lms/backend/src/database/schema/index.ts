import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  vector,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['admin', 'teacher', 'student', 'parent'] }).notNull(),
  phoneNumber: text('phone_number').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  classIds: text('class_ids').array().notNull().default('{}'),
  classId: text('class_id'),
  studentId: text('student_id'),
  rollNo: integer('roll_no'),
  academicYear: text('academic_year'),
  childrenIds: text('children_ids').array().notNull().default('{}'),
  gender: text('gender'),
  password: text('password'),
  streakCount: integer('streak_count').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  language: text('language'),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  plan: text('plan'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').notNull(),
  plan: text('plan').notNull(),
  status: text('status').notNull(),
  studentLimit: integer('student_limit'),
  teacherLimit: integer('teacher_limit'),
  features: jsonb('features'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const textbooks = pgTable('textbooks', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  subjectId: uuid('subject_id').notNull(),
  classId: uuid('class_id').notNull(),
  teacherId: uuid('teacher_id').notNull(),
  description: text('description').notNull().default(''),
  coverImage: text('cover_image').notNull().default(''),
  storagePath: text('storage_path').notNull().default(''),
  pdfUrl: text('pdf_url').notNull().default(''),
  status: text('status', { enum: ['processing', 'ready', 'failed'] }).notNull().default('processing'),
  chapterCount: integer('chapter_count').notNull().default(0),
  totalConcepts: integer('total_concepts').notNull().default(0),
  completedConcepts: integer('completed_concepts').notNull().default(0),
  failureReason: text('failure_reason'),
  logs: text('logs').array().notNull().default('{}'),
  processingStage: text('processing_stage'),
  processingProgress: integer('processing_progress').default(0),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  summary: text('summary').notNull().default(''),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const concepts = pgTable('concepts', {
  id: uuid('id').primaryKey(),
  chapterId: uuid('chapter_id').notNull(),
  textbookId: uuid('textbook_id').notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  notes: text('notes'),
  videoLinks: text('video_links').array().notNull().default('{}'),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conceptNotes = pgTable('concept_notes', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull(),
  textbookId: uuid('textbook_id').notNull(),
  chapterId: uuid('chapter_id').notNull(),
  summary: text('summary').notNull().default(''),
  notes: text('notes').notNull().default(''),
  keyPoints: text('key_points').notNull().default(''),
  formulas: text('formulas').notNull().default(''),
  examples: text('examples').notNull().default(''),
  learningObjectives: text('learning_objectives').notNull().default(''),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conceptVideos = pgTable('concept_videos', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull(),
  textbookId: uuid('textbook_id').notNull(),
  chapterId: uuid('chapter_id').notNull(),
  videoId: text('video_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  channel: text('channel').notNull().default(''),
  thumbnail: text('thumbnail').notNull().default(''),
  duration: text('duration').notNull().default(''),
  score: real('score').notNull().default(0),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conceptQuestions = pgTable('concept_questions', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull(),
  textbookId: uuid('textbook_id').notNull(),
  chapterId: uuid('chapter_id').notNull(),
  question: text('question').notNull(),
  type: text('type').notNull(),
  difficulty: text('difficulty').notNull(),
  options: text('options').array(),
  answer: text('answer').notNull(),
  explanation: text('explanation').notNull().default(''),
  passageText: text('passage_text'),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conceptResources = pgTable('concept_resources', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull(),
  textbookId: uuid('textbook_id').notNull(),
  chapterId: uuid('chapter_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  source: text('source').notNull().default(''),
  description: text('description').notNull().default(''),
  score: real('score').notNull().default(0),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id'),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull(),
  status: text('status', { enum: ['PROCESSING', 'COMPLETED', 'FAILED'] }).notNull().default('PROCESSING'),
  progress: integer('progress').notNull().default(0),
  currentStep: text('current_step').notNull().default(''),
  error: text('error'),
  data: jsonb('data').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rawPages = pgTable('raw_pages', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull(),
  pageNum: integer('page_num'),
  text: text('text').notNull(),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  section: text('section'),
  room: text('room'),
  capacity: integer('capacity').default(0),
  status: text('status').default('active'),
  schoolId: uuid('school_id'),
  studentCount: integer('student_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull(),
  classId: uuid('class_id').notNull(),
  date: text('date').notNull(),
  status: text('status', { enum: ['present', 'absent', 'late', 'holiday'] }).notNull(),
  markedBy: uuid('marked_by'),
  note: text('note').default(''),
  markedAt: timestamp('marked_at', { withTimezone: true }),
  schoolId: uuid('school_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feeStructures = pgTable('fee_structures', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id'),
  name: text('name').notNull(),
  amount: numeric('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  classId: uuid('class_id'),
  academicYear: text('academic_year'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feePayments = pgTable('fee_payments', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull(),
  feeStructureId: uuid('fee_structure_id').notNull(),
  amount: numeric('amount').notNull(),
  schoolId: uuid('school_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const firestoreDocs = pgTable('firestore_docs', {
  collection: text('collection').notNull(),
  docId: text('doc_id').notNull(),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.collection, table.docId] }),
  collectionIdx: index('idx_firestore_docs_collection').on(table.collection),
}));
