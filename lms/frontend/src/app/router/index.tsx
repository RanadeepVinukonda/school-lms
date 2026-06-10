import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import StudentLayout from '@/app/layouts/StudentLayout';
import TeacherLayout from '@/app/layouts/TeacherLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { ROUTES } from '@/lib/constants';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

import WelcomePage from '@/app/pages/WelcomePage';
import LoginSelectorPage from '@/app/pages/auth/LoginSelectorPage';
import StudentLoginPage from '@/app/pages/auth/StudentLoginPage';
import TeacherLoginPage from '@/app/pages/auth/TeacherLoginPage';

import StudentDashboardPage from '@/app/pages/student/StudentDashboardPage';
import SubjectsPage from '@/app/pages/student/SubjectsPage';
import SubjectDetailPage from '@/app/pages/student/SubjectDetailPage';
import TextbookDetailPage from '@/app/pages/student/TextbookDetailPage';
import StudentChapterPage from '@/app/pages/student/StudentChapterPage';
import StudentConceptPage from '@/app/pages/student/StudentConceptPage';
import AdaptiveQuizPage from '@/app/pages/student/AdaptiveQuizPage';
import LessonViewPage from '@/app/pages/student/LessonViewPage';
import StudentExamsPage from '@/app/pages/student/StudentExamsPage';
import StudentTimetablePage from '@/app/pages/student/StudentTimetablePage';
import StudentTasksPage from '@/app/pages/student/StudentTasksPage';
import StudentProfilePage from '@/app/pages/student/StudentProfilePage';
import StudentProfileEditPage from '@/app/pages/student/StudentProfileEditPage';
import AssignmentDetailPage from '@/app/pages/student/AssignmentDetailPage';
import QuizAttemptPage from '@/app/pages/student/QuizAttemptPage';
import ExamAttemptPage from '@/app/pages/student/ExamAttemptPage';

import TeacherDashboardPage from '@/app/pages/teacher/TeacherDashboardPage';
import TeacherStudentsPage from '@/app/pages/teacher/TeacherStudentsPage';
import TeacherStudentDetailPage from '@/app/pages/teacher/TeacherStudentDetailPage';
import TeacherExamsPage from '@/app/pages/teacher/TeacherExamsPage';
import TeacherExamCorrectionPage from '@/app/pages/teacher/TeacherExamCorrectionPage';
import TeacherTextbooksPage from '@/app/pages/teacher/TeacherTextbooksPage';
import TeacherTextbookDetailPage from '@/app/pages/teacher/TeacherTextbookDetailPage';
import TeacherTextbookUploadPage from '@/app/pages/teacher/TeacherTextbookUploadPage';
import TeacherConceptViewPage from '@/app/pages/teacher/TeacherConceptViewPage';
import TeacherProfilePage from '@/app/pages/teacher/TeacherProfilePage';
import TeacherProfileEditPage from '@/app/pages/teacher/TeacherProfileEditPage';

import AdminDashboardPage from '@/app/pages/admin/AdminDashboardPage';
import AdminStudentsPage from '@/app/pages/admin/AdminStudentsPage';
import AdminTeachersPage from '@/app/pages/admin/AdminTeachersPage';
import AdminClassesPage from '@/app/pages/admin/AdminClassesPage';
import AdminTimetablePage from '@/app/pages/admin/AdminTimetablePage';
import AdminSubjectsPage from '@/app/pages/admin/AdminSubjectsPage';
import AdminSettingsPage from '@/app/pages/admin/AdminSettingsPage';
import AdminProfileEditPage from '@/app/pages/admin/AdminProfileEditPage';
import UserManagementPage from '@/app/pages/admin/UserManagementPage';

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
    children: [
      { path: ROUTES.LOGIN, element: <LoginSelectorPage /> },
      { path: ROUTES.LOGIN_STUDENT, element: <StudentLoginPage /> },
      { path: ROUTES.LOGIN_TEACHER, element: <TeacherLoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterForm /> },
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
    element: (
      <ProtectedRoute roles={['student']} checkSetup>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.STUDENT_DASHBOARD, element: <StudentDashboardPage /> },
      { path: ROUTES.STUDENT_SUBJECTS, element: <SubjectsPage /> },
      { path: ROUTES.STUDENT_SUBJECT(':id'), element: <SubjectDetailPage /> },
      { path: ROUTES.STUDENT_TEXTBOOK(':id'), element: <TextbookDetailPage /> },
      { path: ROUTES.STUDENT_CHAPTER(':textbookId', ':chapterId'), element: <StudentChapterPage /> },
      { path: ROUTES.STUDENT_CONCEPT(':conceptId'), element: <StudentConceptPage /> },
      { path: ROUTES.STUDENT_CONCEPT_QUIZ(':conceptId'), element: <AdaptiveQuizPage /> },
      { path: ROUTES.STUDENT_LESSON(':id'), element: <LessonViewPage /> },
      { path: ROUTES.STUDENT_EXAMS, element: <StudentExamsPage /> },
      { path: ROUTES.STUDENT_TASKS, element: <StudentTasksPage /> },
      { path: ROUTES.STUDENT_TIMETABLE, element: <StudentTimetablePage /> },
      { path: ROUTES.STUDENT_PROFILE, element: <StudentProfilePage /> },
      { path: ROUTES.STUDENT_PROFILE_EDIT, element: <StudentProfileEditPage /> },
      { path: ROUTES.ASSIGNMENT_DETAIL(':id'), element: <AssignmentDetailPage /> },
      { path: ROUTES.QUIZ_ATTEMPT(':id'), element: <QuizAttemptPage /> },
      { path: ROUTES.EXAM_DETAIL(':id'), element: <ExamAttemptPage /> },
    ],
  },

  {
    element: (
      <ProtectedRoute roles={['teacher']} checkSetup>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.TEACHER_DASHBOARD, element: <TeacherDashboardPage /> },
      { path: ROUTES.TEACHER_STUDENTS, element: <TeacherStudentsPage /> },
      { path: ROUTES.TEACHER_STUDENT(':id'), element: <TeacherStudentDetailPage /> },
      { path: ROUTES.TEACHER_EXAMS, element: <TeacherExamsPage /> },
      { path: ROUTES.TEACHER_EXAM_CORRECT(':id'), element: <TeacherExamCorrectionPage /> },
      { path: ROUTES.TEACHER_TEXTBOOKS, element: <TeacherTextbooksPage /> },
      { path: ROUTES.TEACHER_TEXTBOOK(':textbookId'), element: <TeacherTextbookDetailPage /> },
      { path: ROUTES.TEACHER_TEXTBOOK_UPLOAD, element: <TeacherTextbookUploadPage /> },
      { path: ROUTES.TEACHER_CONCEPT(':textbookId', ':chapterId', ':conceptId'), element: <TeacherConceptViewPage /> },
      { path: ROUTES.TEACHER_PROFILE, element: <TeacherProfilePage /> },
      { path: ROUTES.TEACHER_PROFILE_EDIT, element: <TeacherProfileEditPage /> },
    ],
  },

  {
    element: (
      <ProtectedRoute roles={['super_admin', 'admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.ADMIN_DASHBOARD, element: <AdminDashboardPage /> },
      { path: ROUTES.ADMIN_STUDENTS, element: <AdminStudentsPage /> },
      { path: ROUTES.ADMIN_TEACHERS, element: <AdminTeachersPage /> },
      { path: ROUTES.ADMIN_CLASSES, element: <AdminClassesPage /> },
      { path: ROUTES.ADMIN_CLASS_TIMETABLE(':id'), element: <AdminTimetablePage /> },
      { path: ROUTES.ADMIN_SUBJECTS, element: <AdminSubjectsPage /> },
      { path: ROUTES.ADMIN_SETTINGS, element: <AdminSettingsPage /> },
      { path: '/admin/profile/edit', element: <AdminProfileEditPage /> },
      { path: ROUTES.ADMIN_USERS, element: <UserManagementPage /> },
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
    element: <Navigate to={ROUTES.WELCOME} replace />,
  },
]);
