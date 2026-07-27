export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoUrl?: string;
  isActive: boolean;
  classIds: string[];
  classId?: string;
  studentId?: string;
  rollNo?: number;
  academicYear?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassDTO {
  id: string;
  name: string;
  code?: string;
  description?: string;
  section?: string;
  room?: string;
  capacity?: number;
  academicYear?: string;
  status: string;
  schoolId?: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureDTO {
  id: string;
  schoolId?: string;
  name: string;
  amount: number;
  dueDate?: string;
  classId?: string;
  academicYear?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeePaymentDTO {
  id: string;
  studentId: string;
  feeStructureId: string;
  amount: number;
  schoolId?: string;
  paymentMethod?: string;
  transactionId?: string;
  status: string;
  createdAt: string;
}

export interface QuizDTO {
  id: string;
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  questionCount: number;
  timeLimitMinutes?: number;
  passingScore: number;
  status: string;
  releasedAt?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttemptDTO {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent?: number;
  }>;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  status: string;
  level?: string;
}

export interface AttendanceDTO {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  markedBy?: string;
  note?: string;
  markedAt?: string;
  academicYear?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDTO {
  id: string;
  schoolId: string;
  name: string;
  categoryId?: string;
  quantity: number;
  unit?: string;
  reorderLevel?: number;
  supplierId?: string;
  deletedAt?: string;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  performedBy: string;
  performedByName?: string;
  performedByRole?: string;
  oldValue?: unknown;
  newValue?: unknown;
  summary?: string;
  timestamp: string;
}

export function toUserDTO(row: Record<string, unknown>): UserDTO {
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string,
    role: row.role as string,
    phoneNumber: row.phone_number as string | undefined,
    photoUrl: row.photo_url as string | undefined,
    isActive: row.is_active as boolean,
    classIds: (row.class_ids as string[]) || [],
    classId: row.class_id as string | undefined,
    studentId: row.student_id as string | undefined,
    rollNo: row.roll_no as number | undefined,
    academicYear: row.academic_year as string | undefined,
    schoolId: row.school_id as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toClassDTO(row: Record<string, unknown>): ClassDTO {
  return {
    id: row.id as string,
    name: row.name as string,
    code: row.code as string | undefined,
    description: row.description as string | undefined,
    section: row.section as string | undefined,
    room: row.room as string | undefined,
    capacity: row.capacity as number | undefined,
    academicYear: row.academic_year as string | undefined,
    status: (row.status as string) || 'active',
    schoolId: row.school_id as string | undefined,
    studentCount: (row.student_count as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toFeeStructureDTO(row: Record<string, unknown>): FeeStructureDTO {
  return {
    id: row.id as string,
    schoolId: row.school_id as string | undefined,
    name: row.name as string,
    amount: Number(row.amount),
    dueDate: row.due_date as string | undefined,
    classId: row.class_id as string | undefined,
    academicYear: row.academic_year as string | undefined,
    description: row.description as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toFeePaymentDTO(row: Record<string, unknown>): FeePaymentDTO {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    feeStructureId: row.fee_structure_id as string,
    amount: Number(row.amount),
    schoolId: row.school_id as string | undefined,
    paymentMethod: row.payment_method as string | undefined,
    transactionId: row.transaction_id as string | undefined,
    status: (row.status as string) || 'completed',
    createdAt: row.created_at as string,
  };
}

export function toAttendanceDTO(row: Record<string, unknown>): AttendanceDTO {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    classId: row.class_id as string,
    date: row.date as string,
    status: row.status as 'present' | 'absent' | 'late' | 'holiday',
    markedBy: row.marked_by as string | undefined,
    note: row.note as string | undefined,
    markedAt: row.marked_at as string | undefined,
    academicYear: row.academic_year as string | undefined,
    schoolId: row.school_id as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface GradeDTO {
  id: string;
  studentId: string;
  courseId?: string;
  subjectId?: string;
  classId?: string;
  itemName?: string;
  score: number;
  totalPoints?: number;
  percentage?: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy?: string;
  academicYear?: string;
  term?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GradebookEntryDTO {
  studentId: string;
  studentName: string;
  grades: GradeDTO[];
  averageScore: number;
  letterGrade?: string;
}

export interface AttendanceReportDTO {
  classId: string;
  className?: string;
  startDate: string;
  endDate: string;
  summary: {
    totalStudents: number;
    averageAttendance: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  studentBreakdown: Array<{
    studentId: string;
    studentName: string;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  }>;
}

export interface InventoryCategoryDTO {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryUsageLogDTO {
  id: string;
  schoolId: string;
  actionBy: string;
  itemId: string;
  quantityChanged: number;
  reason?: string;
  createdAt: string;
}

export interface LoginResultDTO {
  user: UserDTO;
  uid: string;
  token: string;
}

export interface RefreshTokenResultDTO {
  token: string;
  refresh_token: string;
  uid: string;
}

export interface QuizResultDTO {
  questionId: string;
  questionText?: string;
  answer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
  correctAnswer?: string;
  explanation?: string;
}

export interface OutstandingFeeReportDTO {
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  payments: FeePaymentDTO[];
}
