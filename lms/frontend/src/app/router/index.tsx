import { createBrowserRouter, Navigate } from 'react-router-dom';
import NotFoundPage from '@/app/pages/shared/NotFoundPage';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import StudentLayout from '@/app/layouts/StudentLayout';
import TeacherLayout from '@/app/layouts/TeacherLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';
import { ROUTES } from '@/lib/constants';

import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

import WelcomePage from '@/app/pages/WelcomePage';
import LoginPage from '@/app/pages/auth/LoginPage';

import StudentDashboardPage from '@/app/pages/student/StudentDashboardPage';
import StudentExamsPage from '@/app/pages/student/StudentExamsPage';
import StudentTasksPage from '@/app/pages/student/StudentTasksPage';
import StudentProfilePage from '@/app/pages/student/StudentProfilePage';
import StudentProfileEditPage from '@/app/pages/student/StudentProfileEditPage';
import AssignmentDetailPage from '@/app/pages/student/AssignmentDetailPage';
import QuizAttemptPage from '@/app/pages/student/QuizAttemptPage';
import ExamAttemptPage from '@/app/pages/student/ExamAttemptPage';
import StudentQuizTakePageV2 from '@/app/pages/student/StudentQuizTakePageV2';
import StudentConceptPage from '@/app/pages/student/StudentConceptPage';

import TeacherDashboardPage from '@/app/pages/teacher/TeacherDashboardPage';
import TeacherStudentsPage from '@/app/pages/teacher/TeacherStudentsPage';
import TeacherStudentDetailPage from '@/app/pages/teacher/TeacherStudentDetailPage';
import TeacherExamsPage from '@/app/pages/teacher/TeacherExamsPage';
import TeacherExamCorrectionPage from '@/app/pages/teacher/TeacherExamCorrectionPage';
import TeacherTextbooksPage from '@/app/pages/teacher/TeacherTextbooksPage';
import TeacherTextbookDetailPage from '@/app/pages/teacher/TeacherTextbookDetailPage';
import TeacherTextbookUploadPage from '@/app/pages/teacher/TeacherTextbookUploadPage';
import TeacherConceptViewPage from '@/app/pages/teacher/TeacherConceptViewPage';
import TeacherAssessmentCreatePage from '@/app/pages/teacher/TeacherAssessmentCreatePage';
import TeacherExamCreatePage from '@/app/pages/teacher/TeacherExamCreatePage';
import TeacherClassDetailPage from '@/app/pages/teacher/TeacherClassDetailPage';
import TeacherSubjectDetailPage from '@/app/pages/teacher/TeacherSubjectDetailPage';
import TeacherProfilePage from '@/app/pages/teacher/TeacherProfilePage';
import TeacherProfileEditPage from '@/app/pages/teacher/TeacherProfileEditPage';
import TeacherVideoLibraryPage from '@/app/pages/teacher/TeacherVideoLibraryPage';
import TeacherAnalyticsPage from '@/app/pages/teacher/TeacherAnalyticsPage';
import TeacherResultsPushPage from '@/app/pages/teacher/TeacherResultsPushPage';
import TeacherQuestionBankPage from '@/app/pages/teacher/TeacherQuestionBankPage';
import TeacherQuestionPapersPage from '@/app/pages/teacher/TeacherQuestionPapersPage';
import TeacherTestTemplatesPage from '@/app/pages/teacher/TeacherTestTemplatesPage';
import TeacherTestSchedulePage from '@/app/pages/teacher/TeacherTestSchedulePage';
import TeacherPreviousYearQPage from '@/app/pages/teacher/TeacherPreviousYearQPage';

import AdminDashboardPage from '@/app/pages/admin/AdminDashboardPage';
import AdminAcademicYearsPage from '@/app/pages/admin/AdminAcademicYearsPage';
import AdminStudentsPage from '@/app/pages/admin/AdminStudentsPage';
import AdminTeachersPage from '@/app/pages/admin/AdminTeachersPage';
import AdminClassesPage from '@/app/pages/admin/AdminClassesPage';
import AdminSubjectsPage from '@/app/pages/admin/AdminSubjectsPage';
import AdminSettingsPage from '@/app/pages/admin/AdminSettingsPage';
import AdminProfileEditPage from '@/app/pages/admin/AdminProfileEditPage';
import UserManagementPage from '@/app/pages/admin/UserManagementPage';
import AdminAuditLogsPage from '@/app/pages/admin/AdminAuditLogsPage';

import RollNumberEntryPage from '@/app/pages/student/RollNumberEntryPage';
import ClassSelectionPage from '@/app/pages/teacher/ClassSelectionPage';

import NotificationsPage from '@/app/pages/NotificationsPage';

export const router = createBrowserRouter([
  {
    path: ROUTES.WELCOME,
    element: <WelcomePage />,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordForm /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordForm /> },
    ],
  },

  {
    element: <ProtectedRoute><RollNumberEntryPage /></ProtectedRoute>,
    path: ROUTES.STUDENT_ROLL_NUMBER,
  },
  {
    element: <ProtectedRoute><ClassSelectionPage /></ProtectedRoute>,
    path: ROUTES.TEACHER_SELECT_CLASS,
  },

  {
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute roles={['student']} checkSetup>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.STUDENT_DASHBOARD, element: <StudentDashboardPage /> },
      { path: ROUTES.STUDENT_EXAMS, element: <StudentExamsPage /> },
      { path: ROUTES.STUDENT_TASKS, element: <StudentTasksPage /> },
      { path: ROUTES.STUDENT_PROFILE, element: <StudentProfilePage /> },
      { path: ROUTES.STUDENT_PROFILE_EDIT, element: <StudentProfileEditPage /> },
      { path: ROUTES.ASSIGNMENT_DETAIL(':id'), element: <AssignmentDetailPage /> },
      { path: ROUTES.QUIZ_ATTEMPT(':id'), element: <QuizAttemptPage /> },
      { path: ROUTES.EXAM_DETAIL(':id'), element: <ExamAttemptPage /> },
      { path: ROUTES.STUDENT_TAKE_ASSESSMENT(':id'), element: <StudentQuizTakePageV2 /> },
      { path: ROUTES.STUDENT_CONCEPT(':conceptId'), element: <StudentConceptPage /> },
    ],
  },

  {
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute roles={['teacher']} checkSetup>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.TEACHER_DASHBOARD, element: <TeacherDashboardPage /> },
      { path: ROUTES.TEACHER_STUDENTS, element: <TeacherStudentsPage /> },
      { path: ROUTES.TEACHER_STUDENT(':id'), element: <TeacherStudentDetailPage /> },
      { path: ROUTES.TEACHER_ASSESSMENTS, element: <TeacherAssessmentCreatePage /> },
      { path: ROUTES.TEACHER_EXAMS, element: <TeacherExamsPage /> },
      { path: ROUTES.TEACHER_EXAM_CREATE, element: <TeacherExamCreatePage /> },
      { path: ROUTES.TEACHER_EXAM_CORRECT(':id'), element: <TeacherExamCorrectionPage /> },
      { path: ROUTES.TEACHER_CLASS(':id'), element: <TeacherClassDetailPage /> },
      { path: ROUTES.TEACHER_SUBJECT(':classId', ':subjectId'), element: <TeacherSubjectDetailPage /> },
      { path: ROUTES.TEACHER_TEXTBOOKS, element: <TeacherTextbooksPage /> },
      { path: ROUTES.TEACHER_TEXTBOOK(':textbookId'), element: <TeacherTextbookDetailPage /> },
      { path: ROUTES.TEACHER_TEXTBOOK_UPLOAD, element: <TeacherTextbookUploadPage /> },
      { path: ROUTES.TEACHER_CONCEPT(':textbookId', ':chapterId', ':conceptId'), element: <TeacherConceptViewPage /> },
      { path: ROUTES.TEACHER_PROFILE, element: <TeacherProfilePage /> },
      { path: ROUTES.TEACHER_PROFILE_EDIT, element: <TeacherProfileEditPage /> },
      { path: ROUTES.TEACHER_VIDEOS, element: <TeacherVideoLibraryPage /> },
      { path: ROUTES.TEACHER_ANALYTICS, element: <TeacherAnalyticsPage /> },
      { path: ROUTES.TEACHER_RESULTS_PUSH, element: <TeacherResultsPushPage /> },
      { path: ROUTES.TEACHER_QUESTION_BANK, element: <TeacherQuestionBankPage /> },
      { path: ROUTES.TEACHER_QUESTION_PAPERS, element: <TeacherQuestionPapersPage /> },
      { path: ROUTES.TEACHER_TEST_TEMPLATES, element: <TeacherTestTemplatesPage /> },
      { path: ROUTES.TEACHER_TEST_SCHEDULE, element: <TeacherTestSchedulePage /> },
      { path: ROUTES.TEACHER_PYQ, element: <TeacherPreviousYearQPage /> },
    ],
  },

  {
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute roles={['super_admin', 'admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.ADMIN_DASHBOARD, element: <AdminDashboardPage /> },
      { path: ROUTES.ADMIN_ACADEMIC_YEARS, element: <AdminAcademicYearsPage /> },
      { path: ROUTES.ADMIN_STUDENTS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_TEACHERS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_CLASSES, element: <AdminClassesPage /> },
      { path: ROUTES.ADMIN_SUBJECTS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_SETTINGS, element: <AdminSettingsPage /> },
      { path: '/admin/profile/edit', element: <AdminProfileEditPage /> },
      { path: ROUTES.ADMIN_USERS, element: <Navigate to={ROUTES.ADMIN_SETTINGS} replace /> },
      { path: ROUTES.ADMIN_AUDIT_LOGS, element: <Navigate to={ROUTES.ADMIN_SETTINGS} replace /> },
    ],
  },

  {
    path: ROUTES.NOTIFICATIONS,
    element: <NotificationsPage />,
  },
  {
    path: ROUTES.HOME,
    element: <Navigate to={ROUTES.WELCOME} replace />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
