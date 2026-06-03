import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import StudentLayout from '@/app/layouts/StudentLayout';
import TeacherLayout from '@/app/layouts/TeacherLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import RoleAwareDashboard from '@/app/router/RoleAwareDashboard';
import { ROUTES } from '@/lib/constants';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

import WelcomePage from '@/app/pages/WelcomePage';
import LoginSelectorPage from '@/app/pages/auth/LoginSelectorPage';
import StudentLoginPage from '@/app/pages/auth/StudentLoginPage';
import TeacherLoginPage from '@/app/pages/auth/TeacherLoginPage';
import AdminLoginPage from '@/app/pages/auth/AdminLoginPage';

import StudentDashboardPage from '@/app/pages/student/StudentDashboardPage';
import SubjectsPage from '@/app/pages/student/SubjectsPage';
import SubjectDetailPage from '@/app/pages/student/SubjectDetailPage';
import StudentExamsPage from '@/app/pages/student/StudentExamsPage';
import StudentTimetablePage from '@/app/pages/student/StudentTimetablePage';
import StudentProfilePage from '@/app/pages/student/StudentProfilePage';

import TeacherDashboardPage from '@/app/pages/teacher/TeacherDashboardPage';
import TeacherStudentsPage from '@/app/pages/teacher/TeacherStudentsPage';
import TeacherStudentDetailPage from '@/app/pages/teacher/TeacherStudentDetailPage';
import TeacherExamsPage from '@/app/pages/teacher/TeacherExamsPage';
import TeacherExamCorrectionPage from '@/app/pages/teacher/TeacherExamCorrectionPage';
import TeacherTextbooksPage from '@/app/pages/teacher/TeacherTextbooksPage';
import TeacherProfilePage from '@/app/pages/teacher/TeacherProfilePage';

import AdminDashboardPage from '@/app/pages/admin/AdminDashboardPage';
import AdminStudentsPage from '@/app/pages/admin/AdminStudentsPage';
import AdminTeachersPage from '@/app/pages/admin/AdminTeachersPage';
import AdminClassesPage from '@/app/pages/admin/AdminClassesPage';
import AdminTimetablePage from '@/app/pages/admin/AdminTimetablePage';
import AdminSubjectsPage from '@/app/pages/admin/AdminSubjectsPage';
import AdminSettingsPage from '@/app/pages/admin/AdminSettingsPage';

import CoursesPage from '@/app/pages/student/CoursesPage';
import CourseDetailPage from '@/app/pages/student/CourseDetailPage';
import LessonViewPage from '@/app/pages/student/LessonViewPage';
import AssignmentsPage from '@/app/pages/student/AssignmentsPage';
import AssignmentDetailPage from '@/app/pages/student/AssignmentDetailPage';
import QuizzesPage from '@/app/pages/student/QuizzesPage';
import QuizAttemptPage from '@/app/pages/student/QuizAttemptPage';
import ExamsPage from '@/app/pages/student/ExamsPage';
import ExamAttemptPage from '@/app/pages/student/ExamAttemptPage';
import GradesPage from '@/app/pages/student/GradesPage';
import MessagesPage from '@/app/pages/student/MessagesPage';
import NotificationsPage from '@/app/pages/student/NotificationsPage';
import MyCoursesPage from '@/app/pages/teacher/MyCoursesPage';
import CourseManagePage from '@/app/pages/teacher/CourseManagePage';
import LessonBuilderPage from '@/app/pages/teacher/LessonBuilderPage';
import AssignmentBuilderPage from '@/app/pages/teacher/AssignmentBuilderPage';
import QuizBuilderPage from '@/app/pages/teacher/QuizBuilderPage';
import GradebookPage from '@/app/pages/teacher/GradebookPage';
import UserManagementPage from '@/app/pages/admin/UserManagementPage';
import ClassManagementPage from '@/app/pages/admin/ClassManagementPage';
import SubjectManagementPage from '@/app/pages/admin/SubjectManagementPage';
import SettingsPage from '@/app/pages/admin/SettingsPage';
import ProfilePage from '@/app/pages/shared/ProfilePage';
import ForbiddenPage from '@/app/pages/shared/ForbiddenPage';

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
      { path: ROUTES.LOGIN_ADMIN, element: <AdminLoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterForm /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordForm /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordForm /> },
    ],
  },

  {
    element: (
      <ProtectedRoute roles={['student']}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.STUDENT_DASHBOARD, element: <StudentDashboardPage /> },
      { path: ROUTES.STUDENT_SUBJECTS, element: <SubjectsPage /> },
      { path: ROUTES.STUDENT_SUBJECT(':id'), element: <SubjectDetailPage /> },
      { path: ROUTES.STUDENT_EXAMS, element: <StudentExamsPage /> },
      { path: ROUTES.STUDENT_TIMETABLE, element: <StudentTimetablePage /> },
      { path: ROUTES.STUDENT_PROFILE, element: <StudentProfilePage /> },
    ],
  },

  {
    element: (
      <ProtectedRoute roles={['teacher']}>
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
      { path: ROUTES.TEACHER_PROFILE, element: <TeacherProfilePage /> },
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
      { path: ROUTES.ADMIN_USERS, element: <UserManagementPage /> },
    ],
  },

  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.DASHBOARD, element: <RoleAwareDashboard /> },
      { path: ROUTES.COURSES, element: <CoursesPage /> },
      { path: ROUTES.COURSE_DETAIL(':id'), element: <CourseDetailPage /> },
      { path: ROUTES.COURSE_LESSON(':courseId', ':lessonId'), element: <LessonViewPage /> },
      { path: ROUTES.MY_COURSES, element: <MyCoursesPage /> },
      { path: ROUTES.COURSE_MANAGE(':id'), element: <CourseManagePage /> },
      { path: ROUTES.LESSON_BUILDER(':courseId'), element: <LessonBuilderPage /> },
      { path: ROUTES.ASSIGNMENT_BUILDER(':courseId'), element: <AssignmentBuilderPage /> },
      { path: ROUTES.QUIZ_BUILDER(':courseId'), element: <QuizBuilderPage /> },
      { path: ROUTES.GRADEBOOK(':courseId'), element: <GradebookPage /> },
      { path: ROUTES.ASSIGNMENTS, element: <AssignmentsPage /> },
      { path: ROUTES.ASSIGNMENT_DETAIL(':id'), element: <AssignmentDetailPage /> },
      { path: ROUTES.QUIZZES, element: <QuizzesPage /> },
      { path: ROUTES.QUIZ_ATTEMPT(':id'), element: <QuizAttemptPage /> },
      { path: ROUTES.EXAMS, element: <ExamsPage /> },
      { path: ROUTES.EXAM_DETAIL(':id'), element: <ExamAttemptPage /> },
      { path: ROUTES.GRADES, element: <GradesPage /> },
      { path: ROUTES.MESSAGES, element: <MessagesPage /> },
      { path: ROUTES.CONVERSATION(':id'), element: <MessagesPage /> },
      { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
      { path: ROUTES.SETTINGS, element: <SettingsPage /> },
      { path: ROUTES.PROFILE, element: <ProfilePage /> },
      { path: ROUTES.USERS, element: <UserManagementPage /> },
      { path: ROUTES.CLASSES, element: <ClassManagementPage /> },
      { path: ROUTES.SUBJECTS, element: <SubjectManagementPage /> },
      { path: '/forbidden', element: <ForbiddenPage /> },
    ],
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
