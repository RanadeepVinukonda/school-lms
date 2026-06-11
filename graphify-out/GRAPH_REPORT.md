# Graph Report - school  (2026-06-11)

## Corpus Check
- 339 files · ~225,319 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2023 nodes · 5374 edges · 112 communities (100 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f680a36`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 144|Community 144]]
- [[_COMMUNITY_Community 148|Community 148]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 169|Community 169]]
- [[_COMMUNITY_Community 170|Community 170]]
- [[_COMMUNITY_Community 173|Community 173]]
- [[_COMMUNITY_Community 176|Community 176]]
- [[_COMMUNITY_Community 178|Community 178]]
- [[_COMMUNITY_Community 182|Community 182]]
- [[_COMMUNITY_Community 183|Community 183]]
- [[_COMMUNITY_Community 186|Community 186]]
- [[_COMMUNITY_Community 191|Community 191]]
- [[_COMMUNITY_Community 192|Community 192]]
- [[_COMMUNITY_Community 197|Community 197]]
- [[_COMMUNITY_Community 198|Community 198]]
- [[_COMMUNITY_Community 214|Community 214]]
- [[_COMMUNITY_Community 250|Community 250]]
- [[_COMMUNITY_Community 271|Community 271]]
- [[_COMMUNITY_Community 279|Community 279]]
- [[_COMMUNITY_Community 323|Community 323]]
- [[_COMMUNITY_Community 326|Community 326]]
- [[_COMMUNITY_Community 346|Community 346]]
- [[_COMMUNITY_Community 358|Community 358]]
- [[_COMMUNITY_Community 366|Community 366]]
- [[_COMMUNITY_Community 375|Community 375]]
- [[_COMMUNITY_Community 378|Community 378]]
- [[_COMMUNITY_Community 395|Community 395]]
- [[_COMMUNITY_Community 403|Community 403]]

## God Nodes (most connected - your core abstractions)
1. `sendSuccess()` - 162 edges
2. `useAuthStore` - 85 edges
3. `cn()` - 79 edges
4. `Button` - 68 edges
5. `Icon()` - 62 edges
6. `SEOHead()` - 56 edges
7. `Card` - 56 edges
8. `CardContent` - 56 edges
9. `pageTransition` - 51 edges
10. `adminAuditEntry()` - 48 edges

## Surprising Connections (you probably didn't know these)
- `getDocumentById()` --calls--> `getCollection()`  [INFERRED]
  lms/backend/src/utils/pagination.ts → lms/backend/src/firebase/firestore.ts
- `School LMS entry page` --conceptually_related_to--> `Genesis entry page`  [INFERRED]
  frontend/index.html → lms/frontend/index.html
- `Genesis entry page` --references--> `Genesis platform icon PNG`  [EXTRACTED]
  lms/frontend/index.html → lms/frontend/public/genesis_icon.png
- `startAssignment()` --calls--> `sendSuccess()`  [EXTRACTED]
  lms/backend/src/controllers/assignment-v2.controller.ts → lms/backend/src/utils/response.ts
- `submitAssignment()` --calls--> `sendSuccess()`  [EXTRACTED]
  lms/backend/src/controllers/assignment-v2.controller.ts → lms/backend/src/utils/response.ts

## Import Cycles
- 1-file cycle: `lms/backend/src/firebase/admin.ts -> lms/backend/src/firebase/admin.ts`

## Communities (112 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (13): apiRateLimit, authRateLimit, defaults, strictRateLimit, uploadRateLimit, chatSchema, router, AppError (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (69): QuestionModel, QuestionRendererProps, QuestionRendererV2(), V2Question, AdminLoginFormData, adminLoginSchema, ForgotForm, forgotSchema (+61 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (16): Firebase platform, School LMS entry page, firebase, vite, Genesis school management platform, Genesis brand logo, Genesis entry page, firebase (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (13): CreateUserInput, userService, AuthStore, AuthState, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (42): bcryptjs, cloudinary, dotenv, express-rate-limit, firebase-functions, jsonwebtoken, morgan, multer (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (36): AdminProfileEditPage(), AdminLoginPage(), StudentLoginPage(), TeacherLoginPage(), NotificationBell(), NotificationsPage(), useAuthStore, AssignmentDetailPage() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (5): AuthGate(), dotVariants, SplashScreenProps, router, queryClient

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (27): BreadcrumbItem, Breadcrumbs(), BreadcrumbsProps, EmptyState(), EmptyStateProps, PageHeader(), PageHeaderProps, Pagination() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (43): schoolInfo, statsConfig, systemConfig, DataFetchWrapper(), formatDate(), formatDateTime(), formatPercentage(), getLetterGrade() (+35 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (31): AdminClassesPage(), ordinal(), categoryColors, categoryOptions, emptyForm, iconOptions, SubjectForm, dayLabels (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (3): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (38): Cat, CATS, CFG, EMPTY, GlobalSearchDialog(), Item, Props, Results (+30 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (12): ACTION_COLORS, AuditLog, Pagination, AssignmentDoc, ExamDoc, roles, SEOHead(), SEOHeadProps (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (40): 1.1 Admin, 1.2 Teacher, 1.3 Student, 1. User Roles & Permissions, 2.1 Core Collections, 2.2 Textbook & Content Collections, 2.3 Question Model (embedded in concept), 2.4 Teacher-Pushed Content (+32 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (40): 10. Integration Points, 1. Architecture Overview, 2. Tech Stack, 3.10 Exam Management, 3.11 Content Management, 3.12 Reports & Analytics, 3.13 Notifications, 3.14 Other (+32 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (47): getFirebaseApp(), initializeFirebase(), serviceAccount, getAdminAuth(), getAdminFirestore(), getAdminStorage(), createUser(), deleteUser() (+39 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (40): @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-hover-card, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-toast (+32 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (47): chat(), getAdminDashboard(), getCourseAnalytics(), getStudentDashboard(), getTeacherDashboard(), getAssessmentAnalytics(), getClassPerformance(), getStudentPerformance() (+39 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (37): axios, material-expressive-react, @material/web, pdfjs-dist, react-dropzone, react-helmet-async, sonner, dependencies (+29 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (12): computeComplexityHandled(), computeLevel(), Difficulty, DIFFICULTY_RANK, StudentLevel, listAssignmentsForClass(), listAssignmentsForTeacher(), submitAssignment() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (23): eslint, @types/node, dependencies, cors, express, firebase-admin, helmet, zod (+15 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (31): createAssignment(), getAssignment(), gradeSubmission(), listAllAssignments(), listAssignmentsByCourse(), listSubmissions(), submitAssignment(), updateAssignment() (+23 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (37): deleteAssignment(), deleteClass(), createCourse(), deleteCourse(), enrollStudent(), getCourse(), getEnrollments(), listCourses() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (22): allowSyntheticDefaultImports, lib, noFallthroughCasesInSwitch, noImplicitReturns, noUnusedLocals, noUnusedParameters, compilerOptions, declaration (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (21): exclude, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (20): 1. Critical Bugs & Logic Errors, 2. Security & Vulnerability Audits, 3. Firestore Performance, Cost, & Data Modeling, 4. Architectural & Deployment Readiness, 5. Recommended Production Features, 🔍 Broken Search & Filtering on Paginated Lists, 📂 Client-Side Bundling of Sensitive API Keys, 💸 High-Cost Admin Dashboard Collection Scans (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (6): createExam(), createQuiz(), getTeacherAssignment(), TeacherClassSubject, createTextbook(), NotFoundError

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (11): Item, NotificationDropdown(), P_CFG, P_ORDER, Priority, TYPE_ICONS, markAllNotificationsRead(), markNotificationRead() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (13): jsdom, @testing-library/jest-dom, @testing-library/react, vitest, devDependencies, autoprefixer, eslint, postcss (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.31
Nodes (12): chatCompletion(), ChatMessage, ChatRequest, ChatResponse, convertToGeminiMessages(), extractGeminiError(), extractJsonBlock(), geminiChatCompletion() (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (11): test, test:watch, name, private, scripts, build, dev, lint (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, preview, type (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.27
Nodes (4): addVideo(), searchAndSave(), searchVideos(), searchVideosForConcept()

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (18): addStudents(), createClass(), getClass(), getRoster(), listClasses(), removeStudents(), updateClass(), countArrayWhere() (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, eslint, postcss, tailwindcss, @types/react, @types/react-dom, typescript (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.39
Nodes (7): router, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema, updateProfileSchema

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 43 - "Community 43"
Cohesion: 0.39
Nodes (6): router, createExamSchema, examQuestionSchema, scheduleExamSchema, submitExamAttemptSchema, updateExamSchema

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): name, private, scripts, build:backend, build:frontend, version

### Community 45 - "Community 45"
Cohesion: 0.38
Nodes (5): router, conversationQuerySchema, createConversationSchema, messageQuerySchema, sendMessageSchema

### Community 46 - "Community 46"
Cohesion: 0.43
Nodes (5): router, createQuizSchema, questionSchema, submitAttemptSchema, updateQuizSchema

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (6): Events, OnStateChangeEvent, Player, PlayerEvent, PlayerOptions, PlayerVars

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (5): app, auth, db, firebaseConfig, storage

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): firestore, indexes, rules, storage, rules

### Community 50 - "Community 50"
Cohesion: 0.47
Nodes (4): router, classQuerySchema, createClassSchema, updateClassSchema

### Community 51 - "Community 51"
Cohesion: 0.53
Nodes (4): router, courseQuerySchema, createCourseSchema, updateCourseSchema

### Community 52 - "Community 52"
Cohesion: 0.47
Nodes (4): router, bulkGradeSchema, gradebookQuerySchema, updateGradeSchema

### Community 53 - "Community 53"
Cohesion: 0.47
Nodes (4): router, createSubjectSchema, subjectQuerySchema, updateSubjectSchema

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (10): createExam(), getExam(), getExamResults(), gradeExamAttempt(), listAllExams(), releaseExamGrades(), scheduleExam(), startExamAttempt() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.53
Nodes (4): router, createUserSchema, updateUserSchema, userQuerySchema

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (4): auth, db, firebaseConfig, storage

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (4): buildCommand, installCommand, outputDirectory, rewrites

### Community 58 - "Community 58"
Cohesion: 0.60
Nodes (3): router, createLessonSchema, updateLessonSchema

### Community 64 - "Community 64"
Cohesion: 0.11
Nodes (22): getAssignmentById(), getResults(), listForClass(), listForTeacher(), releaseAssignment(), releaseGrades(), startAssignment(), submitAssignment() (+14 more)

### Community 105 - "Community 105"
Cohesion: 0.39
Nodes (4): deleteUpload(), router, deleteCloudinaryFile(), sendError()

### Community 106 - "Community 106"
Cohesion: 0.16
Nodes (14): listAuditLogs(), recoverEntity(), assignRole(), createUser(), getStrengthsWeaknesses(), getUser(), listUsers(), pingActive() (+6 more)

### Community 118 - "Community 118"
Cohesion: 0.12
Nodes (11): LoginForm(), RegisterForm(), changePassword(), confirmReset(), loginUser(), resetPassword(), useLogin(), useRegister() (+3 more)

### Community 148 - "Community 148"
Cohesion: 0.70
Nodes (4): useIsDesktop(), useIsMobile(), useIsTablet(), useMediaQuery()

### Community 153 - "Community 153"
Cohesion: 0.09
Nodes (18): allowedOrigins, corsOptions, envSchema, parsed, cleanupExpiredData(), jobs, startScheduler(), checkUpcomingDeadlines() (+10 more)

### Community 157 - "Community 157"
Cohesion: 0.11
Nodes (25): TutorialGuide(), Theme, ThemeToggle(), UserAvatar(), NavItem, navItems, NavItem, navItems (+17 more)

### Community 165 - "Community 165"
Cohesion: 0.08
Nodes (40): formatRelativeTime(), pageTransition, getTimeGreeting(), getClass(), getEnrollmentsByStudent(), getGradesByStudent(), getSubject(), getAllConceptProgress() (+32 more)

### Community 169 - "Community 169"
Cohesion: 0.08
Nodes (35): extractTextFromPDF(), callAI(), extractChapters(), extractJson(), generateConceptContentAndQuestions(), getModel(), safeParse(), sanitizeJson() (+27 more)

### Community 170 - "Community 170"
Cohesion: 0.33
Nodes (4): ALLOWED_ATTRS, ALLOWED_TAGS, sanitizeHtml(), URI_ATTRS

### Community 173 - "Community 173"
Cohesion: 0.06
Nodes (48): getInitials(), uploadImage(), uploadProfileImage(), CorrectionItem, Enrollment, getAllEnrollments(), getAllGrades(), getAssignment() (+40 more)

### Community 176 - "Community 176"
Cohesion: 0.15
Nodes (17): asyncHandler(), authenticate(), requireRole(), router, router, router, router, router (+9 more)

### Community 178 - "Community 178"
Cohesion: 0.29
Nodes (3): optionalAuth(), Request, mockVerifyToken

### Community 182 - "Community 182"
Cohesion: 0.17
Nodes (11): validate(), ValidationTarget, router, router, router, searchConceptSchema, createAssignmentSchema, gradeSubmissionSchema (+3 more)

### Community 183 - "Community 183"
Cohesion: 0.18
Nodes (6): LoadingSkeleton(), LoadingSkeletonProps, ProtectedRoute(), ProtectedRouteProps, roleDashboard(), checkPermission()

### Community 186 - "Community 186"
Cohesion: 0.12
Nodes (17): ForgotPasswordFormData, forgotPasswordSchema, LoginFormData, loginSchema, RegisterFormData, registerSchema, ResetPasswordFormData, resetPasswordSchema (+9 more)

### Community 197 - "Community 197"
Cohesion: 0.09
Nodes (15): createAssignment(), gradeSubmission(), createExam(), gradeExamAttempt(), listAllExams(), scheduleExam(), bulkUpdate(), calculateGPA() (+7 more)

### Community 198 - "Community 198"
Cohesion: 0.08
Nodes (11): listAllAssignments(), listAssignmentsByCourse(), listSubmissions(), getEnrollments(), listCourses(), getConversations(), getMessages(), listSubjects() (+3 more)

### Community 250 - "Community 250"
Cohesion: 0.14
Nodes (5): collections, db, getAssessmentAnalytics(), getAssessmentData(), getStudentPerformance()

### Community 279 - "Community 279"
Cohesion: 0.47
Nodes (5): DEFAULT_SETTINGS, getSettings(), getSystemSettings(), updateSettings(), updateSystemSettings()

### Community 323 - "Community 323"
Cohesion: 0.13
Nodes (21): analyticsService, ChartData, DashboardStats, PerformanceData, AssignmentStatus, Grade, GradeLevel, RubricCriteria (+13 more)

### Community 326 - "Community 326"
Cohesion: 0.13
Nodes (16): api, assignmentService, PaginatedItems, examService, PaginatedItems, messagingService, ApiError, ApiResponse (+8 more)

### Community 346 - "Community 346"
Cohesion: 0.24
Nodes (8): courseService, Course, CourseFilters, CourseLevel, CourseStatus, Enrollment, EnrollmentStatus, Module

### Community 358 - "Community 358"
Cohesion: 0.40
Nodes (4): gradeService, GradeDetail, GradeItem, GradeSummary

### Community 366 - "Community 366"
Cohesion: 0.29
Nodes (6): lessonService, Lesson, LessonProgress, LessonResource, LessonType, ResourceType

### Community 375 - "Community 375"
Cohesion: 0.38
Nodes (5): notificationService, PaginatedNotifications, Notification, NotificationPreferences, NotificationType

### Community 378 - "Community 378"
Cohesion: 0.22
Nodes (8): PaginatedItems, quizService, Question, QuestionType, Quiz, QuizAnswer, QuizAttempt, QuizStatus

### Community 395 - "Community 395"
Cohesion: 0.09
Nodes (32): DataFetchWrapperProps, ErrorState(), ErrorStateProps, accelerateEasing, cardHover, decelerateEasing, emphasizedEasing, fadeIn (+24 more)

### Community 403 - "Community 403"
Cohesion: 0.15
Nodes (8): AdminLayout(), ROLE_HIERARCHY, canManageUsers(), canViewAnalytics(), isAdmin(), isTeacher(), Permission, PERMISSIONS

## Ambiguous Edges - Review These
- `Genesis graduation cap favicon SVG` → `Genesis platform icon PNG`  [AMBIGUOUS]
  lms/frontend/public/favicon.svg · relation: references

## Knowledge Gaps
- **724 isolated node(s):** `$schema`, `plugin`, `@opencode-ai/plugin`, `name`, `private` (+719 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Genesis graduation cap favicon SVG` and `Genesis platform icon PNG`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `dependencies` connect `Community 17` to `Community 2`, `Community 36`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `react` connect `Community 17` to `Community 1`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `sendSuccess()` connect `Community 18` to `Community 64`, `Community 38`, `Community 105`, `Community 106`, `Community 22`, `Community 23`, `Community 54`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `React UI framework` (e.g. with `School LMS entry page` and `Genesis entry page`) actually correct?**
  _`React UI framework` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugin`, `@opencode-ai/plugin` to the rest of the system?**
  _724 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._