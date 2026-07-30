-- Migration 051: Create ALL tables the backend needs (idempotent)
-- If a table already exists, its CREATE TABLE is skipped.
-- If a column is missing from an existing table, it gets added.

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 1: CORE ENTITY TABLES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  student_limit INT DEFAULT 100,
  teacher_limit INT DEFAULT 10,
  features JSONB DEFAULT '{}',
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'parent')),
  phone_number TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  class_ids TEXT[] NOT NULL DEFAULT '{}',
  class_id TEXT,
  student_id TEXT,
  roll_no INTEGER,
  academic_year TEXT,
  children_ids TEXT[] NOT NULL DEFAULT '{}',
  gender TEXT,
  password TEXT,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  language TEXT,
  school_id UUID,
  tutorial_seen BOOLEAN DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'core',
  credit_hours INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  class_id TEXT,
  teacher_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT '',
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  section TEXT,
  room TEXT,
  room_number TEXT DEFAULT '',
  capacity INTEGER DEFAULT 0,
  academic_year TEXT DEFAULT '',
  teacher_ids TEXT[] DEFAULT '{}',
  subject_ids TEXT[] DEFAULT '{}',
  teacher_count INTEGER DEFAULT 0,
  max_students INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  student_count INTEGER DEFAULT 0 NOT NULL,
  student_ids TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 0,
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS textbooks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT,
  subject_id UUID,
  class_id UUID,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  pages INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  chapter_count INTEGER NOT NULL DEFAULT 0,
  total_concepts INTEGER NOT NULL DEFAULT 0,
  completed_concepts INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  logs TEXT[] NOT NULL DEFAULT '{}',
  processing_stage TEXT,
  processing_progress INTEGER DEFAULT 0,
  school_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  school_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  notes TEXT,
  video_links TEXT[] NOT NULL DEFAULT '{}',
  school_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 2: ACADEMIC TABLES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  textbook_id UUID,
  chapter_id UUID,
  course_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  duration REAL DEFAULT 0,
  ordinal INTEGER DEFAULT 0,
  quiz_id TEXT,
  assignment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  school_id UUID,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  chapter_id UUID,
  textbook_id UUID,
  lesson_id UUID,
  course_id TEXT,
  courseId TEXT,
  due_date TEXT,
  dueDate TEXT,
  points REAL DEFAULT 0,
  max_attempts INTEGER DEFAULT 0,
  allow_late_submission BOOLEAN DEFAULT false,
  late_penalty_percent REAL DEFAULT 0,
  passing_grade REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  submission_count INTEGER DEFAULT 0,
  submissionCount INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  school_id UUID,
  createdAt TEXT,
  updatedAt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY,
  assignment_id TEXT,
  assignmentId TEXT,
  student_id TEXT,
  studentId TEXT,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  submitted_at TEXT,
  submittedAt TEXT,
  status TEXT,
  is_late BOOLEAN DEFAULT false,
  isLate BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  attemptNumber INTEGER DEFAULT 1,
  score REAL DEFAULT 0,
  feedback TEXT,
  graded_by TEXT,
  gradedBy TEXT,
  graded_at TEXT,
  gradedAt TEXT,
  school_id UUID,
  course_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  lesson_id UUID,
  chapter_id UUID,
  textbook_id UUID,
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  course_id TEXT,
  courseId TEXT,
  time_limit INTEGER DEFAULT 0,
  timeLimit INTEGER DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  question_count INTEGER DEFAULT 0,
  questionCount INTEGER DEFAULT 0,
  total_points REAL DEFAULT 0,
  totalPoints REAL DEFAULT 0,
  attempt_count INTEGER DEFAULT 0,
  attemptCount INTEGER DEFAULT 0,
  passing_score REAL DEFAULT 0,
  passingScore REAL DEFAULT 0,
  max_attempts INTEGER DEFAULT 0,
  maxAttempts INTEGER DEFAULT 0,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffleQuestions BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT false,
  showResults BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  isPublished BOOLEAN DEFAULT false,
  due_date TEXT,
  dueDate TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  school_id UUID,
  createdAt TEXT,
  updatedAt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  answers JSONB DEFAULT '[]',
  score REAL DEFAULT 0,
  total_points REAL DEFAULT 0,
  percentage REAL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  time_spent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  course_id TEXT,
  courseId TEXT,
  duration INTEGER DEFAULT 0,
  total_points REAL DEFAULT 0,
  totalPoints REAL DEFAULT 0,
  passing_score REAL DEFAULT 0,
  passingScore REAL DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  scheduled_classes TEXT[] DEFAULT '{}',
  scheduledClasses TEXT[] DEFAULT '{}',
  start_date TEXT,
  startDate TEXT,
  end_date TEXT,
  endDate TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_proctored BOOLEAN DEFAULT false,
  isProctored BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffleQuestions BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT false,
  showResults BOOLEAN DEFAULT false,
  grades_released BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 0,
  school_id UUID,
  createdAt TEXT,
  updatedAt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  answers JSONB DEFAULT '[]',
  score REAL DEFAULT 0,
  total_points REAL DEFAULT 0,
  percentage REAL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  time_spent INTEGER DEFAULT 0,
  graded_by UUID,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY,
  studentId TEXT,
  student_id TEXT,
  courseId TEXT,
  course_id TEXT,
  assignmentId TEXT,
  assignment_id TEXT,
  score REAL DEFAULT 0,
  maxScore REAL DEFAULT 0,
  max_score REAL DEFAULT 0,
  letterGrade TEXT,
  letter_grade TEXT,
  comments TEXT,
  date TEXT,
  schoolId TEXT,
  school_id TEXT,
  classId TEXT,
  class_id TEXT,
  subjectId TEXT,
  subject_id TEXT,
  totalPoints REAL DEFAULT 0,
  total_points REAL DEFAULT 0,
  academicYear TEXT,
  academic_year TEXT,
  term TEXT,
  feedback TEXT,
  gradedBy TEXT,
  graded_by TEXT,
  percentage REAL DEFAULT 0,
  remarks TEXT,
  updatedAt TEXT,
  updated_at TEXT,
  examDate TEXT,
  exam_date TEXT,
  semester TEXT,
  createdAt TEXT,
  created_at TEXT,
  created_at_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 3: NOTIFICATIONS, SETTINGS, AUDIT
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT DEFAULT 'normal',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  readAt TIMESTAMPTZ,
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditlogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  target_name TEXT,
  performed_by TEXT NOT NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  old_value JSONB,
  new_value JSONB,
  summary TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 4: AI, TOKENS, DEVICES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  feature TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mfa (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  token TEXT NOT NULL UNIQUE,
  platform TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 5: ERP / TRANSPORT / INVENTORY / HR
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pickup_time TEXT,
  drop_time TEXT,
  fare DECIMAL(10,2) DEFAULT 0.00,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES transport_stops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_student_transport UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS transport_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('boarded', 'alighted', 'absent')),
  direction TEXT NOT NULL CHECK (direction IN ('morning', 'evening')),
  marked_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  catalog_items TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  reorder_level INT DEFAULT 5,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'non-teaching')),
  department TEXT,
  joining_date DATE,
  contract_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_staff_attendance_date UNIQUE (staff_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE CASCADE UNIQUE,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  allowances DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_paid DECIMAL(12,2) NOT NULL,
  allowances_paid DECIMAL(12,2) NOT NULL,
  deductions_paid DECIMAL(12,2) NOT NULL,
  net_salary DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'paid')),
  payslip_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_staff_payroll_month UNIQUE (staff_id, month)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 6: CURRICULUM, BOARDS, ACADEMIC TRACKING
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT,
  concept TEXT,
  learning_objective TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id),
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  chapters JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  accuracy DECIMAL DEFAULT 0,
  attempt_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  mastery_score DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, concept_id)
);

CREATE TABLE IF NOT EXISTS concept_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
  progress REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, concept_id)
);

CREATE TABLE IF NOT EXISTS concept_releases (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  textbook_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  question_bank_released BOOLEAN NOT NULL DEFAULT false,
  assignments_released BOOLEAN NOT NULL DEFAULT false,
  mind_map_released BOOLEAN NOT NULL DEFAULT false,
  school_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 7: MISC TABLES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notice_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_role TEXT NOT NULL DEFAULT '',
  class_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feedback',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  assigned_teacher_name TEXT,
  remarks TEXT,
  resolved_at TIMESTAMPTZ,
  school_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  starter_code TEXT DEFAULT '',
  test_cases JSONB DEFAULT '[]'::jsonb,
  difficulty TEXT DEFAULT 'easy',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject_id UUID,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  room TEXT NOT NULL DEFAULT '',
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  school_id UUID,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, day, period)
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'holiday')),
  marked_by UUID REFERENCES users(id),
  note TEXT DEFAULT '',
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  name TEXT NOT NULL,
  fee_type TEXT,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ,
  class_id UUID REFERENCES classes(id),
  academic_year TEXT,
  term TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  amount NUMERIC NOT NULL,
  amount_paid NUMERIC,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'completed',
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lti_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  client_id TEXT,
  issuer TEXT,
  auth_url TEXT,
  access_token_url TEXT,
  keyset_url TEXT,
  deployment_id TEXT,
  platform_oidc_auth_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 8: CONCEPT EDUCATION TABLES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS concept_notes (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL UNIQUE REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  key_points TEXT NOT NULL DEFAULT '',
  formulas TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  learning_objectives TEXT NOT NULL DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  embedding vector(384),
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concept_videos (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  embedding vector(384),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concept_questions (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  options TEXT[],
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  passage_text TEXT,
  points INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concept_resources (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  embedding vector(384),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY,
  textbook_id UUID NOT NULL UNIQUE REFERENCES textbooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT NOT NULL DEFAULT '',
  error TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  page_num INTEGER,
  text TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 9: FIRESTORE DOC STORE + MIGRATION TRACKING
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS firestore_docs (
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, doc_id)
);

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT,
  duration_ms INTEGER DEFAULT 0,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 10: MISSING COLUMNS ON EXISTING TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- Each ALTER uses IF NOT EXISTS — safe to run regardless of current state.
-- Tables described above may already exist from earlier migrations with
-- different column sets; these ensure the backend-required columns exist.

ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_seen BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credit_hours INTEGER DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS courseId TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS dueDate TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submissionCount INTEGER DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS createdAt TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS updatedAt TEXT;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignmentId TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS studentId TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submittedAt TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS isLate BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attemptNumber INTEGER DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS gradedBy TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS gradedAt TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS course_id UUID;

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS courseId TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS timeLimit INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questionCount INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS totalPoints REAL DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS attemptCount INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passingScore REAL DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS maxAttempts INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS shuffleQuestions BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS showResults BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS isPublished BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS dueDate TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS createdAt TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updatedAt TEXT;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS courseId TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS totalPoints REAL DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passingScore REAL DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS scheduledClasses TEXT[] DEFAULT '{}';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS startDate TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS endDate TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS isProctored BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffleQuestions BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS showResults BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS grades_released BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS createdAt TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updatedAt TEXT;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS performed_by TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS performed_by_name TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS performed_by_role TEXT;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS new_value JSONB;

ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS fee_type TEXT;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS term TEXT;

ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

ALTER TABLE report_feedback ADD COLUMN IF NOT EXISTS school_id UUID;

ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS school_id UUID;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 11: INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_school_id ON textbooks(school_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_teacher_id ON textbooks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_class_id ON textbooks(class_id);
CREATE INDEX IF NOT EXISTS idx_chapters_textbook_id ON chapters(textbook_id);
CREATE INDEX IF NOT EXISTS idx_concepts_chapter_id ON concepts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_concepts_textbook_id ON concepts(textbook_id);
CREATE INDEX IF NOT EXISTS idx_lessons_school_id ON lessons(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_school_id ON quizzes(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_firestore_docs_collection ON firestore_docs(collection);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_id ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_concept_id ON concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_progress_student_id ON concept_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_performed_by ON auditlogs(performed_by);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 12: DEFAULT SCHOOL + ADMIN (public.users only, NOT auth.users)
-- The auth.users insert is done via a separate script (create-admin.mjs)
-- to avoid Supabase GoTrue 500 errors from direct SQL inserts.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO schools (id, name, subdomain, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', 'default', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- Track migration
INSERT INTO _migrations (filename, checksum, duration_ms)
SELECT '051_migrate_all_tables.sql', 'sha256-placeholder', 0
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '051_migrate_all_tables.sql');
