// @ts-nocheck — drizzle-orm/pg-core vector() and index builder types diverge from drizzle-kit; runtime works fine
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
  sql,
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
  schoolId: uuid('school_id').references(() => schools.id),
  version: integer('version').default(0).notNull(),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
  schoolIdx: index('idx_users_school_id').on(table.schoolId),
  roleIdx: index('idx_users_role').on(table.role),
  classIdsIdx: index('idx_users_class_ids').using('gin', table.classIds),
}));

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
  schoolId: uuid('school_id').notNull().references(() => schools.id),
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
  classId: uuid('class_id').notNull().references(() => classes.id),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  description: text('description').notNull().default(''),
  coverImage: text('cover_image').notNull().default(''),
  storagePath: text('storage_path').notNull().default(''),
  pdfUrl: text('pdf_url').notNull().default(''),
  academicYear: text('academic_year').default(''),
  status: text('status', { enum: ['processing', 'ready', 'failed'] }).notNull().default('processing'),
  chapterCount: integer('chapter_count').notNull().default(0),
  totalConcepts: integer('total_concepts').notNull().default(0),
  completedConcepts: integer('completed_concepts').notNull().default(0),
  failureReason: text('failure_reason'),
  logs: text('logs').array().notNull().default('{}'),
  processingStage: text('processing_stage'),
  processingProgress: integer('processing_progress').default(0),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  teacherIdx: index('idx_textbooks_teacher_id').on(table.teacherId),
  classIdx: index('idx_textbooks_class_id').on(table.classId),
  subjectIdx: index('idx_textbooks_subject_id').on(table.subjectId),
  schoolIdx: index('idx_textbooks_school_id').on(table.schoolId),
  statusIdx: index('idx_textbooks_status').on(table.status),
}));

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  summary: text('summary').notNull().default(''),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  textbookIdx: index('idx_chapters_textbook_id').on(table.textbookId),
}));

export const concepts = pgTable('concepts', {
  id: uuid('id').primaryKey(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  notes: text('notes'),
  videoLinks: text('video_links').array().notNull().default('{}'),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  chapterIdx: index('idx_concepts_chapter_id').on(table.chapterId),
  textbookIdx: index('idx_concepts_textbook_id').on(table.textbookId),
}));

export const conceptNotes = pgTable('concept_notes', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull().references(() => concepts.id),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  summary: text('summary').notNull().default(''),
  notes: text('notes').notNull().default(''),
  keyPoints: text('key_points').notNull().default(''),
  formulas: text('formulas').notNull().default(''),
  examples: text('examples').notNull().default(''),
  learningObjectives: text('learning_objectives').notNull().default(''),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conceptIdx: index('idx_concept_notes_concept_id').on(table.conceptId),
  textbookIdx: index('idx_concept_notes_textbook_id').on(table.textbookId),
}));

export const conceptVideos = pgTable('concept_videos', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull().references(() => concepts.id),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  videoId: text('video_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  channel: text('channel').notNull().default(''),
  thumbnail: text('thumbnail').notNull().default(''),
  duration: text('duration').notNull().default(''),
  score: real('score').notNull().default(0),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conceptIdx: index('idx_concept_videos_concept_id').on(table.conceptId),
  textbookIdx: index('idx_concept_videos_textbook_id').on(table.textbookId),
}));

export const conceptQuestions = pgTable('concept_questions', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull().references(() => concepts.id),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  question: text('question').notNull(),
  type: text('type').notNull(),
  difficulty: text('difficulty').notNull(),
  options: text('options').array(),
  answer: text('answer').notNull(),
  explanation: text('explanation').notNull().default(''),
  passageText: text('passage_text'),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conceptIdx: index('idx_concept_questions_concept_id').on(table.conceptId),
  textbookIdx: index('idx_concept_questions_textbook_id').on(table.textbookId),
}));

export const conceptResources = pgTable('concept_resources', {
  id: uuid('id').primaryKey(),
  conceptId: uuid('concept_id').notNull().references(() => concepts.id),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  title: text('title').notNull(),
  url: text('url').notNull(),
  source: text('source').notNull().default(''),
  description: text('description').notNull().default(''),
  score: real('score').notNull().default(0),
  embedding: vector('embedding', { dimensions: 384 }),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conceptIdx: index('idx_concept_resources_concept_id').on(table.conceptId),
  textbookIdx: index('idx_concept_resources_textbook_id').on(table.textbookId),
}));

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
  status: text('status', { enum: ['PROCESSING', 'COMPLETED', 'FAILED'] }).notNull().default('PROCESSING'),
  progress: integer('progress').notNull().default(0),
  currentStep: text('current_step').notNull().default(''),
  error: text('error'),
  data: jsonb('data').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  textbookIdx: index('idx_processing_jobs_textbook_id').on(table.textbookId),
  statusIdx: index('idx_processing_jobs_status').on(table.status),
}));

export const rawPages = pgTable('raw_pages', {
  id: uuid('id').primaryKey(),
  textbookId: uuid('textbook_id').notNull().references(() => textbooks.id),
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
  academicYear: text('academic_year').default(''),
  status: text('status').default('active'),
  schoolId: uuid('school_id').references(() => schools.id),
  studentCount: integer('student_count').notNull().default(0),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  schoolIdx: index('idx_classes_school_id').on(table.schoolId),
}));

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  date: text('date').notNull(),
  status: text('status', { enum: ['present', 'absent', 'late', 'holiday'] }).notNull(),
  markedBy: uuid('marked_by').references(() => users.id),
  note: text('note').default(''),
  markedAt: timestamp('marked_at', { withTimezone: true }),
  academicYear: text('academic_year').default(''),
  schoolId: uuid('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  studentIdx: index('idx_attendance_student_id').on(table.studentId),
  classIdx: index('idx_attendance_class_id').on(table.classId),
  dateIdx: index('idx_attendance_date').on(table.date),
  schoolIdx: index('idx_attendance_school_id').on(table.schoolId),
}));

export const feeStructures = pgTable('fee_structures', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
  amount: numeric('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  classId: uuid('class_id').references(() => classes.id),
  academicYear: text('academic_year'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  schoolIdx: index('idx_fee_structures_school_id').on(table.schoolId),
  classIdx: index('idx_fee_structures_class_id').on(table.classId),
}));

export const feePayments = pgTable('fee_payments', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  feeStructureId: uuid('fee_structure_id').notNull().references(() => feeStructures.id),
  amount: numeric('amount').notNull(),
  schoolId: uuid('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  studentIdx: index('idx_fee_payments_student_id').on(table.studentId),
  feeStructureIdx: index('idx_fee_payments_fee_structure_id').on(table.feeStructureId),
  schoolIdx: index('idx_fee_payments_school_id').on(table.schoolId),
}));

export const conceptMastery = pgTable('concept_mastery', {
  studentId: text('student_id').notNull(),
  conceptId: text('concept_id').notNull(),
  accuracy: real('accuracy').notNull().default(0),
  attemptCount: integer('attempt_count').notNull().default(0),
  masteryScore: real('mastery_score').notNull().default(0),
  lastReviewedAt: text('last_reviewed_at'),
}, (table) => ({
  pk: primaryKey({ columns: [table.studentId, table.conceptId] }),
}));

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  contentType: text('content_type'),
  videoUrl: text('video_url'),
  duration: integer('duration'),
  order: integer('order').notNull().default(0),
  schoolId: uuid('school_id').references(() => schools.id),
  data: jsonb('data').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  courseId: uuid('course_id'),
  dueDate: text('due_date'),
  points: integer('points').notNull().default(0),
  submissionCount: integer('submission_count').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
  schoolId: uuid('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey(),
  studentId: text('student_id').notNull(),
  courseId: text('course_id'),
  score: real('score').notNull().default(0),
  totalPoints: real('total_points').notNull().default(100),
  letterGrade: text('letter_grade'),
  percentage: real('percentage'),
  feedback: text('feedback'),
  remarks: text('remarks'),
  gradedBy: text('graded_by'),
  academicYear: text('academic_year'),
  term: text('term'),
  schoolId: uuid('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey(),
  studentId: text('student_id').notNull(),
  courseId: uuid('course_id'),
  status: text('status').notNull().default('active'),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
});

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  staffId: text('staff_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  reason: text('reason'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  schoolIdx: index('idx_leave_requests_school_id').on(table.schoolId),
  staffIdx: index('idx_leave_requests_staff_id').on(table.staffId),
}));

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  catalogItems: text('catalog_items').array().notNull().default('{}'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  schoolIdx: index('idx_suppliers_school_id').on(table.schoolId),
}));

export const inventoryCategories = pgTable('inventory_categories', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
  description: text('description'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  schoolIdx: index('idx_inventory_categories_school_id').on(table.schoolId),
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
  categoryId: uuid('category_id').references(() => inventoryCategories.id),
  quantity: integer('quantity').notNull().default(0),
  unit: text('unit'),
  reorderLevel: integer('reorder_level'),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  version: integer('version').default(0).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  schoolIdx: index('idx_inventory_items_school_id').on(table.schoolId),
}));

export const inventoryUsageLog = pgTable('inventory_usage_log', {
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  actionBy: text('action_by'),
  itemId: uuid('item_id').references(() => inventoryItems.id),
  quantityChanged: integer('quantity_changed').notNull().default(0),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  schoolIdx: index('idx_inventory_usage_log_school_id').on(table.schoolId),
  itemIdx: index('idx_inventory_usage_log_item_id').on(table.itemId),
}));

export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').primaryKey(),
  userId: text('user_id').notNull(),
  schoolId: uuid('school_id').references(() => schools.id),
  token: text('token').notNull(),
  platform: text('platform'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('idx_device_tokens_token').on(table.token),
  userIdx: index('idx_device_tokens_user_id').on(table.userId),
}));

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  endpoint: text('endpoint'),
  durationMs: integer('duration_ms'),
  success: boolean('success').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_ai_usage_user_id').on(table.userId),
  modelIdx: index('idx_ai_usage_model').on(table.model),
  createdAtIdx: index('idx_ai_usage_created_at').on(table.createdAt),
}));

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
