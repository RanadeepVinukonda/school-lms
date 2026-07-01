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
import StudentGamificationPage from '@/app/pages/student/StudentGamificationPage';
import StudentLeaderboardPage from '@/app/pages/student/StudentLeaderboardPage';
import StudentAITutorPage from '@/app/pages/student/StudentAITutorPage';
import StudentVirtualLabsPage from '@/app/pages/student/StudentVirtualLabsPage';
import StudentVirtualLabDetailPage from '@/app/pages/student/StudentVirtualLabDetailPage';
import StudentMindMapsPage from '@/app/pages/student/StudentMindMapsPage';
import StudentMindMapEditorPage from '@/app/pages/student/StudentMindMapEditorPage';
import K2Layout from '@/app/layouts/K2Layout';
import K2DashboardPage from '@/app/pages/student/K2DashboardPage';
import K2TracingPage from '@/app/pages/student/K2TracingPage';
import K2PhonicsPage from '@/app/pages/student/K2PhonicsPage';
import K2StoriesPage from '@/app/pages/student/K2StoriesPage';
import K2FlashcardsPage from '@/app/pages/student/K2FlashcardsPage';
import StudentCodingPage from '@/app/pages/student/StudentCodingPage';
import StudentCodingEditorPage from '@/app/pages/student/StudentCodingEditorPage';
import StudentStreamProjectsPage from '@/app/pages/student/StudentStreamProjectsPage';
import StudentOCRPage from '@/app/pages/student/StudentOCRPage';
import SubjectsPage from '@/app/pages/student/SubjectsPage';
import SubjectDetailPage from '@/app/pages/student/SubjectDetailPage';
import TextbookDetailPage from '@/app/pages/student/TextbookDetailPage';
import StudentChapterPage from '@/app/pages/student/StudentChapterPage';
import LessonViewPage from '@/app/pages/student/LessonViewPage';
import StudentQuizzesPage from '@/app/pages/student/StudentQuizzesPage';
import AdaptiveQuizPage from '@/app/pages/student/AdaptiveQuizPage';
import StudentNoticeBoardPage from '@/app/pages/student/StudentNoticeBoardPage';
import StudentTimetablePage from '@/app/pages/student/StudentTimetablePage';
import TeacherOCRPage from '@/app/pages/teacher/TeacherOCRPage';
import TeacherUnifiedTestPage from '@/app/pages/teacher/TeacherUnifiedTestPage';
import AboutSchoolPage from '@/app/pages/AboutSchoolPage';

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
import TeacherMindMapsPage from '@/app/pages/teacher/TeacherMindMapsPage';
import TeacherMindMapEditorPage from '@/app/pages/teacher/TeacherMindMapEditorPage';
import TeacherAttendancePage from '@/app/pages/teacher/TeacherAttendancePage';
import TeacherNEPQuestionsPage from '@/app/pages/teacher/TeacherNEPQuestionsPage';
import TeacherRubricPage from '@/app/pages/teacher/TeacherRubricPage';
import TeacherNoticeBoardPage from '@/app/pages/teacher/TeacherNoticeBoardPage';
import TeacherTimetablePage from '@/app/pages/teacher/TeacherTimetablePage';

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
import AdminSchoolAnalyticsPage from '@/app/pages/admin/AdminSchoolAnalyticsPage';
import AdminAttendancePage from '@/app/pages/admin/AdminAttendancePage';
import AdminFeePage from '@/app/pages/admin/AdminFeePage';
import AdminTimetablePage from '@/app/pages/admin/AdminTimetablePage';
import AdminNoticeBoardPage from '@/app/pages/admin/AdminNoticeBoardPage';
import AdminErpDashboardPage from '@/app/pages/admin/AdminErpDashboardPage';
import AdminTransportDashboard from '@/app/pages/admin/AdminTransportDashboard';
import AdminTransportPage from '@/app/pages/admin/AdminTransportPage';
import AdminInventoryPage from '@/app/pages/admin/AdminInventoryPage';
import AdminStaffPage from '@/app/pages/admin/AdminStaffPage';
import AdminLeavePage from '@/app/pages/admin/AdminLeavePage';
import AdminPayrollPage from '@/app/pages/admin/AdminPayrollPage';
import AdminClassroomPage from '@/app/pages/admin/AdminClassroomPage';
import AdminLtiPage from '@/app/pages/admin/AdminLtiPage';

import RollNumberEntryPage from '@/app/pages/student/RollNumberEntryPage';
import ClassSelectionPage from '@/app/pages/teacher/ClassSelectionPage';

import ParentLayout from '@/app/layouts/ParentLayout';
import ParentDashboardPage from '@/app/pages/parent/ParentDashboardPage';
import ParentChildrenPage from '@/app/pages/parent/ParentChildrenPage';
import ParentChildDetailPage from '@/app/pages/parent/ParentChildDetailPage';
import ParentReportsPage from '@/app/pages/parent/ParentReportsPage';
import ParentProfilePage from '@/app/pages/parent/ParentProfilePage';
import ParentNoticeBoardPage from '@/app/pages/parent/ParentNoticeBoardPage';

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
      { path: ROUTES.STUDENT_TAKE_ASSESSMENT(':assessmentId'), element: <StudentQuizTakePageV2 /> },
      { path: ROUTES.STUDENT_CONCEPT(':conceptId'), element: <StudentConceptPage /> },
      { path: ROUTES.STUDENT_AI_TUTOR, element: <StudentAITutorPage /> },
      { path: ROUTES.STUDENT_GAMIFICATION, element: <StudentGamificationPage /> },
      { path: ROUTES.STUDENT_LEADERBOARD, element: <StudentLeaderboardPage /> },
      { path: ROUTES.STUDENT_LABS, element: <StudentVirtualLabsPage /> },
      { path: ROUTES.STUDENT_LAB_DETAIL(':id'), element: <StudentVirtualLabDetailPage /> },
      { path: ROUTES.STUDENT_MIND_MAPS, element: <StudentMindMapsPage /> },
      { path: ROUTES.STUDENT_MIND_MAP_EDITOR(':id'), element: <StudentMindMapEditorPage /> },
      { path: ROUTES.STUDENT_CODING, element: <StudentCodingPage /> },
      { path: ROUTES.STUDENT_CODING_EDITOR(':id'), element: <StudentCodingEditorPage /> },
      { path: ROUTES.STUDENT_STREAM_PROJECTS, element: <StudentStreamProjectsPage /> },
      { path: ROUTES.STUDENT_OCR, element: <StudentOCRPage /> },
      { path: ROUTES.STUDENT_SUBJECTS, element: <SubjectsPage /> },
      { path: ROUTES.STUDENT_SUBJECT(':id'), element: <SubjectDetailPage /> },
      { path: ROUTES.STUDENT_TEXTBOOK(':id'), element: <TextbookDetailPage /> },
      { path: ROUTES.STUDENT_CHAPTER(':textbookId', ':chapterId'), element: <StudentChapterPage /> },
      { path: ROUTES.STUDENT_LESSON(':id'), element: <LessonViewPage /> },
      { path: ROUTES.STUDENT_CONCEPT_QUIZ(':conceptId'), element: <StudentQuizzesPage /> },
      { path: ROUTES.STUDENT_ADAPTIVE_QUIZ(':conceptId'), element: <AdaptiveQuizPage /> },
      { path: ROUTES.STUDENT_NOTICEBOARD, element: <StudentNoticeBoardPage /> },
      { path: ROUTES.STUDENT_TIMETABLE, element: <StudentTimetablePage /> },
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
      { path: ROUTES.TEACHER_ATTENDANCE, element: <TeacherAttendancePage /> },
      { path: ROUTES.TEACHER_MIND_MAPS, element: <TeacherMindMapsPage /> },
      { path: ROUTES.TEACHER_MIND_MAP_EDITOR(':id'), element: <TeacherMindMapEditorPage /> },
      { path: ROUTES.TEACHER_NEP_QUESTIONS, element: <TeacherNEPQuestionsPage /> },
      { path: ROUTES.TEACHER_RUBRICS, element: <TeacherRubricPage /> },
      { path: ROUTES.TEACHER_OCR, element: <TeacherOCRPage /> },
      { path: ROUTES.TEACHER_UNIFIED_TEST, element: <TeacherUnifiedTestPage /> },
      { path: ROUTES.TEACHER_NOTICEBOARD, element: <TeacherNoticeBoardPage /> },
      { path: ROUTES.TEACHER_TIMETABLE, element: <TeacherTimetablePage /> },
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
      { path: ROUTES.ADMIN_SCHOOL_ANALYTICS, element: <AdminSchoolAnalyticsPage /> },
      { path: ROUTES.ADMIN_ATTENDANCE, element: <AdminAttendancePage /> },
      { path: ROUTES.ADMIN_FEE, element: <AdminFeePage /> },
      { path: ROUTES.ADMIN_TIMETABLE, element: <AdminTimetablePage /> },
      { path: ROUTES.ADMIN_NOTICEBOARD, element: <AdminNoticeBoardPage /> },
      { path: ROUTES.ADMIN_ERP_DASHBOARD, element: <AdminErpDashboardPage /> },
      { path: '/admin/transport', element: <AdminTransportDashboard /> },
      { path: '/admin/transport/routes/:id', element: <AdminTransportPage /> },
      { path: '/admin/inventory', element: <AdminInventoryPage /> },
      { path: '/admin/hr', element: <AdminStaffPage /> },
      { path: '/admin/hr/leaves', element: <AdminLeavePage /> },
      { path: '/admin/hr/payroll', element: <AdminPayrollPage /> },
      { path: '/admin/classroom', element: <AdminClassroomPage /> },
      { path: '/admin/lti', element: <AdminLtiPage /> },
    ],
  },

  {
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute roles={['parent']}>
        <ParentLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.PARENT_DASHBOARD, element: <ParentDashboardPage /> },
      { path: ROUTES.PARENT_CHILDREN, element: <ParentChildrenPage /> },
      { path: ROUTES.PARENT_CHILD(':studentId'), element: <ParentChildDetailPage /> },
      { path: ROUTES.PARENT_REPORTS, element: <ParentReportsPage /> },
      { path: ROUTES.PARENT_PROFILE, element: <ParentProfilePage /> },
      { path: ROUTES.PARENT_NOTICEBOARD, element: <ParentNoticeBoardPage /> },
    ],
  },

  {
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute roles={['student']}>
        <K2Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.K2_DASHBOARD, element: <K2DashboardPage /> },
      { path: ROUTES.K2_TRACING, element: <K2TracingPage /> },
      { path: ROUTES.K2_PHONICS, element: <K2PhonicsPage /> },
      { path: ROUTES.K2_STORIES, element: <K2StoriesPage /> },
      { path: ROUTES.K2_FLASHCARDS, element: <K2FlashcardsPage /> },
      { path: ROUTES.K2_FLASHCARD_CATEGORY(':category'), element: <K2FlashcardsPage /> },
    ],
  },

  {
    path: ROUTES.NOTIFICATIONS,
    element: <NotificationsPage />,
  },
  {
    path: ROUTES.ABOUT,
    element: <AboutSchoolPage />,
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
