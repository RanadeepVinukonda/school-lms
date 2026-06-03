import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import RoleAwareDashboard from '@/app/router/RoleAwareDashboard';
import { ROUTES } from '@/lib/constants';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

import CoursesPage from '@/app/pages/student/CoursesPage';
import CourseDetailPage from '@/app/pages/student/CourseDetailPage';
import LessonViewPage from '@/app/pages/student/LessonViewPage';
import AssignmentDetailPage from '@/app/pages/student/AssignmentDetailPage';
import QuizAttemptPage from '@/app/pages/student/QuizAttemptPage';
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
    path: ROUTES.HOME,
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: <LoginForm />,
      },
      {
        path: ROUTES.REGISTER,
        element: <RegisterForm />,
      },
      {
        path: ROUTES.FORGOT_PASSWORD,
        element: <ForgotPasswordForm />,
      },
      {
        path: ROUTES.RESET_PASSWORD,
        element: <ResetPasswordForm />,
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <RoleAwareDashboard />,
      },
      {
        path: ROUTES.COURSES,
        element: <CoursesPage />,
      },
      {
        path: ROUTES.COURSE_DETAIL(':id'),
        element: <CourseDetailPage />,
      },
      {
        path: ROUTES.COURSE_LESSON(':courseId', ':lessonId'),
        element: <LessonViewPage />,
      },
      {
        path: ROUTES.MY_COURSES,
        element: <MyCoursesPage />,
      },
      {
        path: ROUTES.COURSE_MANAGE(':id'),
        element: <CourseManagePage />,
      },
      {
        path: ROUTES.LESSON_BUILDER(':courseId'),
        element: <LessonBuilderPage />,
      },
      {
        path: ROUTES.ASSIGNMENT_BUILDER(':courseId'),
        element: <AssignmentBuilderPage />,
      },
      {
        path: ROUTES.QUIZ_BUILDER(':courseId'),
        element: <QuizBuilderPage />,
      },
      {
        path: ROUTES.GRADEBOOK(':courseId'),
        element: <GradebookPage />,
      },
      {
        path: ROUTES.ASSIGNMENTS,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.ASSIGNMENT_DETAIL(':id'),
        element: <AssignmentDetailPage />,
      },
      {
        path: ROUTES.QUIZZES,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.QUIZ_ATTEMPT(':id'),
        element: <QuizAttemptPage />,
      },
      {
        path: ROUTES.EXAMS,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.EXAM_DETAIL(':id'),
        element: <ExamAttemptPage />,
      },
      {
        path: ROUTES.GRADES,
        element: <GradesPage />,
      },
      {
        path: ROUTES.MESSAGES,
        element: <MessagesPage />,
      },
      {
        path: ROUTES.CONVERSATION(':id'),
        element: <MessagesPage />,
      },
      {
        path: ROUTES.NOTIFICATIONS,
        element: <NotificationsPage />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <SettingsPage />,
      },
      {
        path: ROUTES.PROFILE,
        element: <ProfilePage />,
      },
      {
        path: ROUTES.USERS,
        element: <UserManagementPage />,
      },
      {
        path: ROUTES.CLASSES,
        element: <ClassManagementPage />,
      },
      {
        path: ROUTES.SUBJECTS,
        element: <SubjectManagementPage />,
      },
      {
        path: ROUTES.ANALYTICS,
        element: <Navigate to={ROUTES.ADMIN} replace />,
      },
      {
        path: '/forbidden',
        element: <ForbiddenPage />,
      },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={['super_admin', 'admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.ADMIN,
        element: <RoleAwareDashboard />,
      },
      {
        path: ROUTES.ADMIN_USERS,
        element: <UserManagementPage />,
      },
      {
        path: ROUTES.ADMIN_SETTINGS,
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
]);
