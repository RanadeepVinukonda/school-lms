import {
  UserDTO, QuizDTO, QuizAttemptDTO, AttendanceDTO, FeeStructureDTO, FeePaymentDTO,
  InventoryItemDTO, GradeDTO, GradebookEntryDTO, AttendanceReportDTO,
  InventoryCategoryDTO, InventoryUsageLogDTO, LoginResultDTO, RefreshTokenResultDTO,
  QuizResultDTO, OutstandingFeeReportDTO,
} from './dto';

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IQuizService {
  createQuiz(data: Record<string, unknown>): Promise<QuizDTO>;
  updateQuiz(quizId: string, teacherId: string, data: Record<string, unknown>): Promise<QuizDTO>;
  deleteQuiz(quizId: string, teacherId: string): Promise<void>;
  releaseQuiz(quizId: string, teacherId: string): Promise<QuizDTO>;
  republishQuiz(quizId: string, teacherId: string): Promise<QuizDTO>;
  getQuizById(quizId: string): Promise<QuizDTO | null>;
  getQuizForConcept(conceptId: string): Promise<QuizDTO | null>;
  listQuizzesForClass(classId: string, schoolId: string, studentId?: string): Promise<QuizDTO[]>;
  listQuizzesForTeacher(teacherId: string, schoolId: string): Promise<QuizDTO[]>;
  releaseQuizGrades(quizId: string, showResults: boolean): Promise<void>;
  getQuizResults(quizId: string, studentId: string): Promise<QuizResultDTO[]>;
  startQuizAttempt(quizId: string, studentId: string, selectedModels: string[]): Promise<QuizAttemptDTO>;
  submitQuizAttempt(attemptId: string, studentId: string, data: Record<string, unknown>): Promise<QuizAttemptDTO>;
  getQuizAttemptsForStudent(studentId: string): Promise<QuizAttemptDTO[]>;
}

export interface IGradeService {
  getStudentGrades(studentId: string, schoolId?: string): Promise<GradeDTO[]>;
  getGradebook(classId: string, schoolId?: string): Promise<GradebookEntryDTO[]>;
  updateGrade(gradeId: string, data: Record<string, unknown>): Promise<GradeDTO>;
  bulkUpdate(updates: Array<{ id: string; data: Record<string, unknown> }>): Promise<GradeDTO[]>;
  generateReport(studentId: string, schoolId?: string): Promise<Record<string, unknown>>;
}

export interface IAttendanceService {
  markAttendance(data: Record<string, unknown>): Promise<AttendanceDTO>;
  getClassAttendance(classId: string, date: string, schoolId?: string): Promise<AttendanceDTO[]>;
  getStudentAttendance(studentId: string, schoolId?: string): Promise<AttendanceDTO[]>;
  getAttendanceReport(classId: string, startDate: string, endDate: string, schoolId?: string): Promise<AttendanceReportDTO>;
  exportAttendanceCSV(classId: string, startDate: string, endDate: string, schoolId?: string): Promise<string>;
}

export interface IFeeService {
  createFeeSchedule(data: Record<string, unknown>): Promise<FeeStructureDTO>;
  listFeeSchedules(schoolId?: string, academicYear?: string, classId?: string): Promise<FeeStructureDTO[]>;
  getFeeSchedule(id: string): Promise<FeeStructureDTO | null>;
  recordPayment(data: Record<string, unknown>): Promise<FeePaymentDTO>;
  getStudentPayments(studentId: string, schoolId?: string): Promise<FeePaymentDTO[]>;
  getOutstandingReport(schoolId?: string): Promise<OutstandingFeeReportDTO[]>;
}

export interface IInventoryService {
  getSupplier(supplierId: string, schoolId?: string): Promise<InventoryItemDTO | null>;
  listSuppliers(schoolId?: string): Promise<InventoryItemDTO[]>;
  createSupplier(data: Record<string, unknown>): Promise<InventoryItemDTO>;
  updateSupplier(supplierId: string, data: Record<string, unknown>): Promise<InventoryItemDTO>;
  deleteSupplier(supplierId: string): Promise<void>;
  getCategory(categoryId: string, schoolId?: string): Promise<InventoryCategoryDTO | null>;
  listCategories(schoolId?: string): Promise<InventoryCategoryDTO[]>;
  createCategory(data: Record<string, unknown>): Promise<InventoryCategoryDTO>;
  updateCategory(categoryId: string, data: Record<string, unknown>): Promise<InventoryCategoryDTO>;
  deleteCategory(categoryId: string): Promise<void>;
  getItem(itemId: string, schoolId?: string): Promise<InventoryItemDTO | null>;
  listItems(schoolId?: string): Promise<InventoryItemDTO[]>;
  createItem(data: Record<string, unknown>): Promise<InventoryItemDTO>;
  updateItem(itemId: string, data: Record<string, unknown>): Promise<InventoryItemDTO>;
  deleteItem(itemId: string): Promise<void>;
  logUsage(data: Record<string, unknown>): Promise<void>;
  getItemUsage(itemId: string, schoolId?: string): Promise<InventoryUsageLogDTO[]>;
}

export interface IAuthService {
  register(data: Record<string, unknown>): Promise<UserDTO>;
  login(email: string, password: string): Promise<LoginResultDTO>;
  getUserProfile(uid: string): Promise<UserDTO | null>;
  updateUserProfile(uid: string, data: Record<string, unknown>): Promise<UserDTO>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(uid: string, newPassword: string): Promise<void>;
  changePassword(uid: string, currentPassword: string, newPassword: string): Promise<void>;
  resetWithToken(accessToken: string, newPassword: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<RefreshTokenResultDTO>;
  verifyUserToken(uid: string): Promise<boolean>;
  logout(token: string): Promise<void>;
  getUserFromToken(token: string): Promise<UserDTO | null>;
}
