import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { ROUTES } from '@/lib/constants';

const DashboardPage = () => (
  <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
    Dashboard content coming soon
  </div>
);

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
        element: <DashboardPage />,
      },
      {
        path: ROUTES.COURSES,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.ASSIGNMENTS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.QUIZZES,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.EXAMS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.GRADES,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.MESSAGES,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.NOTIFICATIONS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.PROFILE,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.USERS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.CLASSES,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.SUBJECTS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.ANALYTICS,
        element: <DashboardPage />,
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
        element: <DashboardPage />,
      },
      {
        path: ROUTES.ADMIN_USERS,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.ADMIN_SETTINGS,
        element: <DashboardPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
]);
