import { collections } from '../firebase/firestore';
import { logger } from '../utils/logger';

/** Get a student's dashboard summary: total enrolled courses, unread notifications, overall grade, and stats. */
export async function getStudentDashboard(studentId: string) {
  const coursesSnapshot = await collections.enrollment()
    .where('studentId', '==', studentId)
    .where('status', '==', 'active')
    .get();

  const courseIds = coursesSnapshot.docs.map((d) => d.data().courseId);
  const totalCourses = courseIds.length;

  const notificationsSnapshot = await collections.notifications()
    .where('userId', '==', studentId)
    .where('read', '==', false)
    .get();
  const unreadNotifications = notificationsSnapshot.docs.length;

  const gradesSnapshot = await collections.grades()
    .where('studentId', '==', studentId)
    .get();

  const grades = gradesSnapshot.docs.map((d) => d.data());
  const totalScore = grades.reduce((sum: number, g: { score?: number; totalPoints?: number }) => sum + (g.score || 0), 0);
  const totalPoints = grades.reduce((sum: number, g: { score?: number; totalPoints?: number }) => sum + (g.totalPoints || 1), 0);
  const overallGrade = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const now = new Date().toISOString();
  const coursePromises = courseIds.map(async (cid) => {
    const assignmentsSnapshot = await collections.assignments()
      .where('courseId', '==', cid)
      .where('dueDate', '>=', now)
      .get();
    const examsSnapshot = await collections.exams()
      .where('courseId', '==', cid)
      .where('startDate', '>=', now)
      .get();
    return {
      pendingAssignments: assignmentsSnapshot.docs.length,
      upcomingExams: examsSnapshot.docs.length,
    };
  });
  const results = await Promise.all(coursePromises);
  const pendingAssignments = results.reduce((sum, r) => sum + r.pendingAssignments, 0);
  const upcomingExams = results.reduce((sum, r) => sum + r.upcomingExams, 0);

  logger.info('Student dashboard retrieved', { studentId });

  return {
    totalCourses,
    unreadNotifications,
    overallGrade,
    averageScore: overallGrade,
    pendingAssignments,
    upcomingExams,
    recentActivity: [],
  };
}

/** Get a teacher's dashboard summary: total courses, total students, pending grading, unread notifications. */
export async function getTeacherDashboard(teacherId: string) {
  const coursesSnapshot = await collections.courses()
    .where('teacherId', '==', teacherId)
    .get();

  const courses = coursesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as any));
  const totalCourses = courses.length;

  const coursePromises = courses.map(async (course) => {
    const submissionsSnapshot = await collections.submissions()
      .where('courseId', '==', course.id)
      .where('status', '==', 'submitted')
      .get();
    return {
      students: course.enrollmentCount || 0,
      pending: submissionsSnapshot.docs.length,
    };
  });
  const results = await Promise.all(coursePromises);
  const totalStudents = results.reduce((sum, r) => sum + r.students, 0);
  const pendingGrading = results.reduce((sum, r) => sum + r.pending, 0);

  const notificationsSnapshot = await collections.notifications()
    .where('userId', '==', teacherId)
    .where('read', '==', false)
    .get();
  const unreadNotifications = notificationsSnapshot.docs.length;

  logger.info('Teacher dashboard retrieved', { teacherId });

  return {
    totalCourses,
    totalStudents,
    pendingGrading,
    unreadNotifications,
  };
}

/** Get an admin dashboard summary: user counts, course/class stats. */
export async function getAdminDashboard() {
  const studentsCount = (await collections.users().where('role', '==', 'student').count().get()).data().count;
  const teachersCount = (await collections.users().where('role', '==', 'teacher').count().get()).data().count;
  const adminsCount = (await collections.users().where('role', '==', 'admin').count().get()).data().count;
  const parentsCount = (await collections.users().where('role', '==', 'parent').count().get()).data().count;

  const totalCourses = (await collections.courses().count().get()).data().count;
  const publishedCourses = (await collections.courses().where('status', '==', 'published').count().get()).data().count;

  const totalClasses = (await collections.classes().count().get()).data().count;
  const activeClasses = (await collections.classes().where('status', '==', 'active').count().get()).data().count;

  logger.info('Admin dashboard retrieved');

  return {
    totalUsers: studentsCount + teachersCount + adminsCount + parentsCount,
    totalStudents: studentsCount,
    totalTeachers: teachersCount,
    totalAdmins: adminsCount,
    totalParents: parentsCount,
    totalCourses,
    publishedCourses,
    totalClasses,
    activeClasses,
  };
}

/** Get analytics for a single course: enrollment, lessons, assignments, submissions, grades, completion rates. */
export async function getCourseAnalytics(courseId: string) {
  const courseDoc = await collections.courses().doc(courseId).get();
  if (!courseDoc.exists) {
    return null;
  }

  const courseData = courseDoc.data()!;

  const enrollmentsSnapshot = await collections.enrollment()
    .where('courseId', '==', courseId)
    .where('status', '==', 'active')
    .get();
  const enrolledStudents = enrollmentsSnapshot.docs.length;

  const lessonsSnapshot = await collections.lessons()
    .where('courseId', '==', courseId)
    .get();
  const totalLessons = lessonsSnapshot.docs.length;

  const assignmentsSnapshot = await collections.assignments()
    .where('courseId', '==', courseId)
    .get();
  const totalAssignments = assignmentsSnapshot.docs.length;
  const submissionsSnapshot = await collections.submissions()
    .where('courseId', '==', courseId)
    .get();
  const totalSubmissions = submissionsSnapshot.docs.length;

  const gradesSnapshot = await collections.grades()
    .where('courseId', '==', courseId)
    .get();
  const grades = gradesSnapshot.docs.map((d) => d.data());
  const totalScore = grades.reduce((sum: number, g: { score?: number; totalPoints?: number }) => sum + (g.score || 0), 0);
  const totalPoints = grades.reduce((sum: number, g: { score?: number; totalPoints?: number }) => sum + (g.totalPoints || 1), 0);
  const averageGrade = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const completionRates: Array<{ lessonId: string; title: string; completedBy: number }> = [];
  lessonsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    completionRates.push({
      lessonId: doc.id,
      title: data.title || '',
      completedBy: data.completedBy?.length || 0,
    });
  });

  logger.info('Course analytics retrieved', { courseId });

  return {
    courseId,
    courseTitle: courseData.title,
    enrolledStudents,
    totalLessons,
    totalAssignments,
    totalSubmissions,
    submissionRate: totalAssignments > 0 ? Math.round((totalSubmissions / totalAssignments) * 100) : 0,
    averageGrade,
    completionRates,
  };
}
