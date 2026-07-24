import { Suspense } from 'react';
import { lazyRetry } from '@/lib/lazyRetry';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import NotFoundPage from '@/app/pages/shared/NotFoundPage';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import StudentLayout from '@/app/layouts/StudentLayout';
import TeacherLayout from '@/app/layouts/TeacherLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';
import { ROUTES } from '@/lib/constants';
import ParentLayout from '@/app/layouts/ParentLayout';
import K2Layout from '@/app/layouts/K2Layout';

function PageFallback() {
  return <div className="p-6"><LoadingSkeleton type="card" count={3} /></div>;
}

const WelcomePage = lazyRetry(() => import('@/app/pages/WelcomePage'));
const LoginPage = lazyRetry(() => import('@/app/pages/auth/LoginPage'));
const ForgotPasswordForm = lazyRetry(() => import('@/features/auth/components/ForgotPasswordForm'));
const ResetPasswordForm = lazyRetry(() => import('@/features/auth/components/ResetPasswordForm'));
const NotificationsPage = lazyRetry(() => import('@/app/pages/NotificationsPage'));
const AboutSchoolPage = lazyRetry(() => import('@/app/pages/AboutSchoolPage'));
const PrivacyPolicyPage = lazyRetry(() => import('@/app/pages/legal/PrivacyPolicyPage'));
const TermsConditionsPage = lazyRetry(() => import('@/app/pages/legal/TermsConditionsPage'));
const RollNumberEntryPage = lazyRetry(() => import('@/app/pages/student/RollNumberEntryPage'));
const ClassSelectionPage = lazyRetry(() => import('@/app/pages/teacher/ClassSelectionPage'));

const StudentDashboardPage = lazyRetry(() => import('@/app/pages/student/StudentDashboardPage'));
const StudentExamsPage = lazyRetry(() => import('@/app/pages/student/StudentExamsPage'));
const StudentTasksPage = lazyRetry(() => import('@/app/pages/student/StudentTasksPage'));
const StudentProfilePage = lazyRetry(() => import('@/app/pages/student/StudentProfilePage'));
const StudentProfileEditPage = lazyRetry(() => import('@/app/pages/student/StudentProfileEditPage'));
const AssignmentDetailPage = lazyRetry(() => import('@/app/pages/student/AssignmentDetailPage'));
const QuizAttemptPage = lazyRetry(() => import('@/app/pages/student/QuizAttemptPage'));
const ExamAttemptPage = lazyRetry(() => import('@/app/pages/student/ExamAttemptPage'));
const StudentQuizTakePageV2 = lazyRetry(() => import('@/app/pages/student/StudentQuizTakePageV2'));
const StudentConceptPage = lazyRetry(() => import('@/app/pages/student/StudentConceptPage'));
const StudentGamificationPage = lazyRetry(() => import('@/app/pages/student/StudentGamificationPage'));
const StudentLeaderboardPage = lazyRetry(() => import('@/app/pages/student/StudentLeaderboardPage'));
const StudentAITutorPage = lazyRetry(() => import('@/app/pages/student/StudentAITutorPage'));
const StudentCodingPage = lazyRetry(() => import('@/app/pages/student/StudentCodingPage'));
const StudentCodingEditorPage = lazyRetry(() => import('@/app/pages/student/StudentCodingEditorPage'));
const StudentOCRPage = lazyRetry(() => import('@/app/pages/student/StudentOCRPage'));
const SubjectsPage = lazyRetry(() => import('@/app/pages/student/SubjectsPage'));
const SubjectDetailPage = lazyRetry(() => import('@/app/pages/student/SubjectDetailPage'));
const TextbookDetailPage = lazyRetry(() => import('@/app/pages/student/TextbookDetailPage'));
const StudentChapterPage = lazyRetry(() => import('@/app/pages/student/StudentChapterPage'));
const LessonViewPage = lazyRetry(() => import('@/app/pages/student/LessonViewPage'));
const StudentQuizzesPage = lazyRetry(() => import('@/app/pages/student/StudentQuizzesPage'));
const AdaptiveQuizPage = lazyRetry(() => import('@/app/pages/student/AdaptiveQuizPage'));
const StudentNoticeBoardPage = lazyRetry(() => import('@/app/pages/student/StudentNoticeBoardPage'));
const StudentTimetablePage = lazyRetry(() => import('@/app/pages/student/StudentTimetablePage'));
const StudentReportPage = lazyRetry(() => import('@/app/pages/student/StudentReportPage'));
const K2DashboardPage = lazyRetry(() => import('@/app/pages/student/K2DashboardPage'));
const K2TracingPage = lazyRetry(() => import('@/app/pages/student/K2TracingPage'));
const K2PhonicsPage = lazyRetry(() => import('@/app/pages/student/K2PhonicsPage'));
const K2StoriesPage = lazyRetry(() => import('@/app/pages/student/K2StoriesPage'));
const K2FlashcardsPage = lazyRetry(() => import('@/app/pages/student/K2FlashcardsPage'));

const TeacherDashboardPage = lazyRetry(() => import('@/app/pages/teacher/TeacherDashboardPage'));
const TeacherStudentsPage = lazyRetry(() => import('@/app/pages/teacher/TeacherStudentsPage'));
const TeacherStudentDetailPage = lazyRetry(() => import('@/app/pages/teacher/TeacherStudentDetailPage'));
const TeacherExamsPage = lazyRetry(() => import('@/app/pages/teacher/TeacherExamsPage'));
const TeacherExamCorrectionPage = lazyRetry(() => import('@/app/pages/teacher/TeacherExamCorrectionPage'));
const TeacherTextbooksPage = lazyRetry(() => import('@/app/pages/teacher/TeacherTextbooksPage'));
const TeacherTextbookDetailPage = lazyRetry(() => import('@/app/pages/teacher/TeacherTextbookDetailPage'));
const TeacherTextbookUploadPage = lazyRetry(() => import('@/app/pages/teacher/TeacherTextbookUploadPage'));
const TeacherConceptViewPage = lazyRetry(() => import('@/app/pages/teacher/TeacherConceptViewPage'));
const TeacherAssessmentCreatePage = lazyRetry(() => import('@/app/pages/teacher/TeacherAssessmentCreatePage'));
const TeacherExamCreatePage = lazyRetry(() => import('@/app/pages/teacher/TeacherExamCreatePage'));
const TeacherClassDetailPage = lazyRetry(() => import('@/app/pages/teacher/TeacherClassDetailPage'));
const TeacherSubjectDetailPage = lazyRetry(() => import('@/app/pages/teacher/TeacherSubjectDetailPage'));
const TeacherProfilePage = lazyRetry(() => import('@/app/pages/teacher/TeacherProfilePage'));
const TeacherProfileEditPage = lazyRetry(() => import('@/app/pages/teacher/TeacherProfileEditPage'));
const TeacherVideoLibraryPage = lazyRetry(() => import('@/app/pages/teacher/TeacherVideoLibraryPage'));
const TeacherAnalyticsPage = lazyRetry(() => import('@/app/pages/teacher/TeacherAnalyticsPage'));
const TeacherResultsPushPage = lazyRetry(() => import('@/app/pages/teacher/TeacherResultsPushPage'));
const TeacherQuestionPapersPage = lazyRetry(() => import('@/app/pages/teacher/TeacherQuestionPapersPage'));
const TeacherTestTemplatesPage = lazyRetry(() => import('@/app/pages/teacher/TeacherTestTemplatesPage'));
const TeacherTestSchedulePage = lazyRetry(() => import('@/app/pages/teacher/TeacherTestSchedulePage'));
const TeacherPreviousYearQPage = lazyRetry(() => import('@/app/pages/teacher/TeacherPreviousYearQPage'));
const TeacherCodingPage = lazyRetry(() => import('@/app/pages/teacher/TeacherCodingPage'));
const TeacherCodingEditorPage = lazyRetry(() => import('@/app/pages/teacher/TeacherCodingEditorPage'));
const TeacherAttendancePage = lazyRetry(() => import('@/app/pages/teacher/TeacherAttendancePage'));
const TeacherNEPQuestionsPage = lazyRetry(() => import('@/app/pages/teacher/TeacherNEPQuestionsPage'));
const TeacherRubricPage = lazyRetry(() => import('@/app/pages/teacher/TeacherRubricPage'));
const TeacherNoticeBoardPage = lazyRetry(() => import('@/app/pages/teacher/TeacherNoticeBoardPage'));
const TeacherTimetablePage = lazyRetry(() => import('@/app/pages/teacher/TeacherTimetablePage'));
const TeacherOCRPage = lazyRetry(() => import('@/app/pages/teacher/TeacherOCRPage'));
const TeacherReportPage = lazyRetry(() => import('@/app/pages/teacher/TeacherReportPage'));
const TeacherUnifiedTestPage = lazyRetry(() => import('@/app/pages/teacher/TeacherUnifiedTestPage'));

const AdminDashboardPage = lazyRetry(() => import('@/app/pages/admin/AdminDashboardPage'));
const AdminAcademicYearsPage = lazyRetry(() => import('@/app/pages/admin/AdminAcademicYearsPage'));
const AdminClassesPage = lazyRetry(() => import('@/app/pages/admin/AdminClassesPage'));
const AdminSettingsPage = lazyRetry(() => import('@/app/pages/admin/AdminSettingsPage'));
const AdminProfileEditPage = lazyRetry(() => import('@/app/pages/admin/AdminProfileEditPage'));
const AdminSchoolAnalyticsPage = lazyRetry(() => import('@/app/pages/admin/AdminSchoolAnalyticsPage'));
const AdminAttendancePage = lazyRetry(() => import('@/app/pages/admin/AdminAttendancePage'));
const AdminFeePage = lazyRetry(() => import('@/app/pages/admin/AdminFeePage'));
const AdminTimetablePage = lazyRetry(() => import('@/app/pages/admin/AdminTimetablePage'));
const AdminNoticeBoardPage = lazyRetry(() => import('@/app/pages/admin/AdminNoticeBoardPage'));
const AdminErpDashboardPage = lazyRetry(() => import('@/app/pages/admin/AdminErpDashboardPage'));
const AdminTransportDashboard = lazyRetry(() => import('@/app/pages/admin/AdminTransportDashboard'));
const AdminTransportPage = lazyRetry(() => import('@/app/pages/admin/AdminTransportPage'));
const AdminInventoryPage = lazyRetry(() => import('@/app/pages/admin/AdminInventoryPage'));
const AdminStaffPage = lazyRetry(() => import('@/app/pages/admin/AdminStaffPage'));
const AdminLeavePage = lazyRetry(() => import('@/app/pages/admin/AdminLeavePage'));
const AdminPayrollPage = lazyRetry(() => import('@/app/pages/admin/AdminPayrollPage'));
const AdminClassroomPage = lazyRetry(() => import('@/app/pages/admin/AdminClassroomPage'));
const AdminLtiPage = lazyRetry(() => import('@/app/pages/admin/AdminLtiPage'));
const AdminReportsPage = lazyRetry(() => import('@/app/pages/admin/AdminReportsPage'));

const ParentDashboardPage = lazyRetry(() => import('@/app/pages/parent/ParentDashboardPage'));
const ParentChildrenPage = lazyRetry(() => import('@/app/pages/parent/ParentChildrenPage'));
const ParentChildDetailPage = lazyRetry(() => import('@/app/pages/parent/ParentChildDetailPage'));
const ParentReportsPage = lazyRetry(() => import('@/app/pages/parent/ParentReportsPage'));
const ParentProfilePage = lazyRetry(() => import('@/app/pages/parent/ParentProfilePage'));
const ParentNoticeBoardPage = lazyRetry(() => import('@/app/pages/parent/ParentNoticeBoardPage'));
const ParentReportPage = lazyRetry(() => import('@/app/pages/parent/ParentReportPage'));

export const router = createBrowserRouter([
  {
    path: ROUTES.WELCOME,
    element: <Suspense fallback={<PageFallback />}><WelcomePage /></Suspense>,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: ROUTES.LOGIN, element: <Suspense fallback={<PageFallback />}><LoginPage /></Suspense> },
      { path: ROUTES.FORGOT_PASSWORD, element: <Suspense fallback={<PageFallback />}><ForgotPasswordForm /></Suspense> },
      { path: ROUTES.RESET_PASSWORD, element: <Suspense fallback={<PageFallback />}><ResetPasswordForm /></Suspense> },
    ],
  },

  {
    element: <Suspense fallback={<PageFallback />}><ProtectedRoute><RollNumberEntryPage /></ProtectedRoute></Suspense>,
    path: ROUTES.STUDENT_ROLL_NUMBER,
  },
  {
    element: <Suspense fallback={<PageFallback />}><ProtectedRoute><ClassSelectionPage /></ProtectedRoute></Suspense>,
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
      { path: ROUTES.STUDENT_DASHBOARD, element: <Suspense fallback={<PageFallback />}><StudentDashboardPage /></Suspense> },
      { path: ROUTES.STUDENT_EXAMS, element: <Suspense fallback={<PageFallback />}><StudentExamsPage /></Suspense> },
      { path: ROUTES.STUDENT_TASKS, element: <Suspense fallback={<PageFallback />}><StudentTasksPage /></Suspense> },
      { path: ROUTES.STUDENT_PROFILE, element: <Suspense fallback={<PageFallback />}><StudentProfilePage /></Suspense> },
      { path: ROUTES.STUDENT_PROFILE_EDIT, element: <Suspense fallback={<PageFallback />}><StudentProfileEditPage /></Suspense> },
      { path: ROUTES.ASSIGNMENT_DETAIL(':id'), element: <Suspense fallback={<PageFallback />}><AssignmentDetailPage /></Suspense> },
      { path: ROUTES.QUIZ_ATTEMPT(':id'), element: <Suspense fallback={<PageFallback />}><QuizAttemptPage /></Suspense> },
      { path: ROUTES.EXAM_DETAIL(':id'), element: <Suspense fallback={<PageFallback />}><ExamAttemptPage /></Suspense> },
      { path: ROUTES.STUDENT_TAKE_ASSESSMENT(':assessmentId'), element: <Suspense fallback={<PageFallback />}><StudentQuizTakePageV2 /></Suspense> },
      { path: ROUTES.STUDENT_CONCEPT(':conceptId'), element: <Suspense fallback={<PageFallback />}><StudentConceptPage /></Suspense> },
      { path: ROUTES.STUDENT_AI_TUTOR, element: <Suspense fallback={<PageFallback />}><StudentAITutorPage /></Suspense> },
      { path: ROUTES.STUDENT_GAMIFICATION, element: <Suspense fallback={<PageFallback />}><StudentGamificationPage /></Suspense> },
      { path: ROUTES.STUDENT_LEADERBOARD, element: <Suspense fallback={<PageFallback />}><StudentLeaderboardPage /></Suspense> },
      { path: ROUTES.STUDENT_CODING, element: <Suspense fallback={<PageFallback />}><StudentCodingPage /></Suspense> },
      { path: ROUTES.STUDENT_CODING_EDITOR(':id'), element: <Suspense fallback={<PageFallback />}><StudentCodingEditorPage /></Suspense> },
      { path: ROUTES.STUDENT_OCR, element: <Suspense fallback={<PageFallback />}><StudentOCRPage /></Suspense> },
      { path: ROUTES.STUDENT_SUBJECTS, element: <Suspense fallback={<PageFallback />}><SubjectsPage /></Suspense> },
      { path: ROUTES.STUDENT_SUBJECT(':id'), element: <Suspense fallback={<PageFallback />}><SubjectDetailPage /></Suspense> },
      { path: ROUTES.STUDENT_TEXTBOOK(':id'), element: <Suspense fallback={<PageFallback />}><TextbookDetailPage /></Suspense> },
      { path: ROUTES.STUDENT_CHAPTER(':textbookId', ':chapterId'), element: <Suspense fallback={<PageFallback />}><StudentChapterPage /></Suspense> },
      { path: ROUTES.STUDENT_LESSON(':id'), element: <Suspense fallback={<PageFallback />}><LessonViewPage /></Suspense> },
      { path: ROUTES.STUDENT_CONCEPT_QUIZ(':conceptId'), element: <Suspense fallback={<PageFallback />}><StudentQuizzesPage /></Suspense> },
      { path: ROUTES.STUDENT_ADAPTIVE_QUIZ(':conceptId'), element: <Suspense fallback={<PageFallback />}><AdaptiveQuizPage /></Suspense> },
      { path: ROUTES.STUDENT_NOTICEBOARD, element: <Suspense fallback={<PageFallback />}><StudentNoticeBoardPage /></Suspense> },
      { path: ROUTES.STUDENT_TIMETABLE, element: <Suspense fallback={<PageFallback />}><StudentTimetablePage /></Suspense> },
      { path: ROUTES.STUDENT_REPORT, element: <Suspense fallback={<PageFallback />}><StudentReportPage /></Suspense> },
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
      { path: ROUTES.TEACHER_DASHBOARD, element: <Suspense fallback={<PageFallback />}><TeacherDashboardPage /></Suspense> },
      { path: ROUTES.TEACHER_STUDENTS, element: <Suspense fallback={<PageFallback />}><TeacherStudentsPage /></Suspense> },
      { path: ROUTES.TEACHER_STUDENT(':id'), element: <Suspense fallback={<PageFallback />}><TeacherStudentDetailPage /></Suspense> },
      { path: ROUTES.TEACHER_ASSESSMENTS, element: <Suspense fallback={<PageFallback />}><TeacherAssessmentCreatePage /></Suspense> },
      { path: ROUTES.TEACHER_EXAMS, element: <Suspense fallback={<PageFallback />}><TeacherExamsPage /></Suspense> },
      { path: ROUTES.TEACHER_EXAM_CREATE, element: <Suspense fallback={<PageFallback />}><TeacherExamCreatePage /></Suspense> },
      { path: ROUTES.TEACHER_EXAM_CORRECT(':id'), element: <Suspense fallback={<PageFallback />}><TeacherExamCorrectionPage /></Suspense> },
      { path: ROUTES.TEACHER_CLASS(':id'), element: <Suspense fallback={<PageFallback />}><TeacherClassDetailPage /></Suspense> },
      { path: ROUTES.TEACHER_SUBJECT(':classId', ':subjectId'), element: <Suspense fallback={<PageFallback />}><TeacherSubjectDetailPage /></Suspense> },
      { path: ROUTES.TEACHER_TEXTBOOKS, element: <Suspense fallback={<PageFallback />}><TeacherTextbooksPage /></Suspense> },
      { path: ROUTES.TEACHER_TEXTBOOK(':textbookId'), element: <Suspense fallback={<PageFallback />}><TeacherTextbookDetailPage /></Suspense> },
      { path: ROUTES.TEACHER_TEXTBOOK_UPLOAD, element: <Suspense fallback={<PageFallback />}><TeacherTextbookUploadPage /></Suspense> },
      { path: ROUTES.TEACHER_CONCEPT(':textbookId', ':chapterId', ':conceptId'), element: <Suspense fallback={<PageFallback />}><TeacherConceptViewPage /></Suspense> },
      { path: ROUTES.TEACHER_PROFILE, element: <Suspense fallback={<PageFallback />}><TeacherProfilePage /></Suspense> },
      { path: ROUTES.TEACHER_PROFILE_EDIT, element: <Suspense fallback={<PageFallback />}><TeacherProfileEditPage /></Suspense> },
      { path: ROUTES.TEACHER_VIDEOS, element: <Suspense fallback={<PageFallback />}><TeacherVideoLibraryPage /></Suspense> },
      { path: ROUTES.TEACHER_ANALYTICS, element: <Suspense fallback={<PageFallback />}><TeacherAnalyticsPage /></Suspense> },
      { path: ROUTES.TEACHER_RESULTS_PUSH, element: <Suspense fallback={<PageFallback />}><TeacherResultsPushPage /></Suspense> },
      { path: ROUTES.TEACHER_QUESTION_PAPERS, element: <Suspense fallback={<PageFallback />}><TeacherQuestionPapersPage /></Suspense> },
      { path: ROUTES.TEACHER_TEST_TEMPLATES, element: <Suspense fallback={<PageFallback />}><TeacherTestTemplatesPage /></Suspense> },
      { path: ROUTES.TEACHER_TEST_SCHEDULE, element: <Suspense fallback={<PageFallback />}><TeacherTestSchedulePage /></Suspense> },
      { path: ROUTES.TEACHER_PYQ, element: <Suspense fallback={<PageFallback />}><TeacherPreviousYearQPage /></Suspense> },
      { path: ROUTES.TEACHER_ATTENDANCE, element: <Suspense fallback={<PageFallback />}><TeacherAttendancePage /></Suspense> },
      { path: ROUTES.TEACHER_CODING, element: <Suspense fallback={<PageFallback />}><TeacherCodingPage /></Suspense> },
      { path: ROUTES.TEACHER_CODING_EDITOR(':id'), element: <Suspense fallback={<PageFallback />}><TeacherCodingEditorPage /></Suspense> },
      { path: ROUTES.TEACHER_NEP_QUESTIONS, element: <Suspense fallback={<PageFallback />}><TeacherNEPQuestionsPage /></Suspense> },
      { path: ROUTES.TEACHER_RUBRICS, element: <Suspense fallback={<PageFallback />}><TeacherRubricPage /></Suspense> },
      { path: ROUTES.TEACHER_OCR, element: <Suspense fallback={<PageFallback />}><TeacherOCRPage /></Suspense> },
      { path: ROUTES.TEACHER_UNIFIED_TEST, element: <Suspense fallback={<PageFallback />}><TeacherUnifiedTestPage /></Suspense> },
      { path: ROUTES.TEACHER_NOTICEBOARD, element: <Suspense fallback={<PageFallback />}><TeacherNoticeBoardPage /></Suspense> },
      { path: ROUTES.TEACHER_TIMETABLE, element: <Suspense fallback={<PageFallback />}><TeacherTimetablePage /></Suspense> },
      { path: ROUTES.TEACHER_REPORT, element: <Suspense fallback={<PageFallback />}><TeacherReportPage /></Suspense> },
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
      { path: ROUTES.ADMIN_DASHBOARD, element: <Suspense fallback={<PageFallback />}><AdminDashboardPage /></Suspense> },
      { path: ROUTES.ADMIN_ACADEMIC_YEARS, element: <Suspense fallback={<PageFallback />}><AdminAcademicYearsPage /></Suspense> },
      { path: ROUTES.ADMIN_STUDENTS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_TEACHERS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_CLASSES, element: <Suspense fallback={<PageFallback />}><AdminClassesPage /></Suspense> },
      { path: ROUTES.ADMIN_SUBJECTS, element: <Navigate to={ROUTES.ADMIN_CLASSES} replace /> },
      { path: ROUTES.ADMIN_SETTINGS, element: <Suspense fallback={<PageFallback />}><AdminSettingsPage /></Suspense> },
      { path: '/admin/profile/edit', element: <Suspense fallback={<PageFallback />}><AdminProfileEditPage /></Suspense> },
      { path: ROUTES.ADMIN_USERS, element: <Navigate to={ROUTES.ADMIN_SETTINGS} replace /> },
      { path: ROUTES.ADMIN_AUDIT_LOGS, element: <Navigate to={ROUTES.ADMIN_SETTINGS} replace /> },
      { path: ROUTES.ADMIN_SCHOOL_ANALYTICS, element: <Suspense fallback={<PageFallback />}><AdminSchoolAnalyticsPage /></Suspense> },
      { path: ROUTES.ADMIN_ATTENDANCE, element: <Suspense fallback={<PageFallback />}><AdminAttendancePage /></Suspense> },
      { path: ROUTES.ADMIN_FEE, element: <Suspense fallback={<PageFallback />}><AdminFeePage /></Suspense> },
      { path: ROUTES.ADMIN_TIMETABLE, element: <Suspense fallback={<PageFallback />}><AdminTimetablePage /></Suspense> },
      { path: ROUTES.ADMIN_NOTICEBOARD, element: <Suspense fallback={<PageFallback />}><AdminNoticeBoardPage /></Suspense> },
      { path: ROUTES.ADMIN_ERP_DASHBOARD, element: <Suspense fallback={<PageFallback />}><AdminErpDashboardPage /></Suspense> },
      { path: '/admin/transport', element: <Suspense fallback={<PageFallback />}><AdminTransportDashboard /></Suspense> },
      { path: '/admin/transport/routes/:id', element: <Suspense fallback={<PageFallback />}><AdminTransportPage /></Suspense> },
      { path: '/admin/inventory', element: <Suspense fallback={<PageFallback />}><AdminInventoryPage /></Suspense> },
      { path: '/admin/hr', element: <Suspense fallback={<PageFallback />}><AdminStaffPage /></Suspense> },
      { path: '/admin/hr/leaves', element: <Suspense fallback={<PageFallback />}><AdminLeavePage /></Suspense> },
      { path: '/admin/hr/payroll', element: <Suspense fallback={<PageFallback />}><AdminPayrollPage /></Suspense> },
      { path: '/admin/classroom', element: <Suspense fallback={<PageFallback />}><AdminClassroomPage /></Suspense> },
      { path: '/admin/lti', element: <Suspense fallback={<PageFallback />}><AdminLtiPage /></Suspense> },
      { path: '/admin/reports', element: <Suspense fallback={<PageFallback />}><AdminReportsPage /></Suspense> },
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
      { path: ROUTES.PARENT_DASHBOARD, element: <Suspense fallback={<PageFallback />}><ParentDashboardPage /></Suspense> },
      { path: ROUTES.PARENT_CHILDREN, element: <Suspense fallback={<PageFallback />}><ParentChildrenPage /></Suspense> },
      { path: ROUTES.PARENT_CHILD(':studentId'), element: <Suspense fallback={<PageFallback />}><ParentChildDetailPage /></Suspense> },
      { path: ROUTES.PARENT_REPORTS, element: <Suspense fallback={<PageFallback />}><ParentReportsPage /></Suspense> },
      { path: ROUTES.PARENT_PROFILE, element: <Suspense fallback={<PageFallback />}><ParentProfilePage /></Suspense> },
      { path: ROUTES.PARENT_NOTICEBOARD, element: <Suspense fallback={<PageFallback />}><ParentNoticeBoardPage /></Suspense> },
      { path: ROUTES.PARENT_REPORT, element: <Suspense fallback={<PageFallback />}><ParentReportPage /></Suspense> },
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
      { path: ROUTES.K2_DASHBOARD, element: <Suspense fallback={<PageFallback />}><K2DashboardPage /></Suspense> },
      { path: ROUTES.K2_TRACING, element: <Suspense fallback={<PageFallback />}><K2TracingPage /></Suspense> },
      { path: ROUTES.K2_PHONICS, element: <Suspense fallback={<PageFallback />}><K2PhonicsPage /></Suspense> },
      { path: ROUTES.K2_STORIES, element: <Suspense fallback={<PageFallback />}><K2StoriesPage /></Suspense> },
      { path: ROUTES.K2_FLASHCARDS, element: <Suspense fallback={<PageFallback />}><K2FlashcardsPage /></Suspense> },
      { path: ROUTES.K2_FLASHCARD_CATEGORY(':category'), element: <Suspense fallback={<PageFallback />}><K2FlashcardsPage /></Suspense> },
    ],
  },

  {
    path: ROUTES.NOTIFICATIONS,
    element: <Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>,
  },
  {
    path: ROUTES.ABOUT,
    element: <Suspense fallback={<PageFallback />}><AboutSchoolPage /></Suspense>,
  },
  {
    path: '/privacy',
    element: <Suspense fallback={<PageFallback />}><PrivacyPolicyPage /></Suspense>,
  },
  {
    path: '/terms',
    element: <Suspense fallback={<PageFallback />}><TermsConditionsPage /></Suspense>,
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
