import { collections } from '../firebase/firestore';
import { logger } from '../utils/logger';

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
  const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
  const totalPoints = grades.reduce((sum: number, g: any) => sum + (g.totalPoints || 1), 0);
  const overallGrade = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const pendingAssignments = 0;
  const upcomingExams = 0;

  const now = new Date().toISOString();
  for (const cid of courseIds) {
    const assignmentsSnapshot = await collections.assignments()
      .where('courseId', '==', cid)
      .where('dueDate', '>=', now)
      .limit(10)
      .get();

    const examsSnapshot = await collections.exams()
      .where('courseId', '==', cid)
      .where('startDate', '>=', now)
      .limit(10)
      .get();
  }

  logger.info('Student dashboard retrieved', { studentId });

  return {
    totalCourses,
    unreadNotifications,
    overallGrade,
    averageScore: overallGrade,
    recentActivity: [],
  };
}

export async function getTeacherDashboard(teacherId: string) {
  const coursesSnapshot = await collections.courses()
    .where('teacherId', '==', teacherId)
    .get();

  const courses = coursesSnapshot.docs.map((d) => d.data());
  const totalCourses = courses.length;

  let totalStudents = 0;
  let pendingGrading = 0;

  for (const course of courses) {
    totalStudents += course.enrollmentCount || 0;

    const submissionsSnapshot = await collections.submissions()
      .where('courseId', '==', course.id)
      .where('status', '==', 'submitted')
      .get();
    pendingGrading += submissionsSnapshot.docs.length;
  }

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

export async function getAdminDashboard() {
  const usersSnapshot = await collections.users().get();
  const totalUsers = usersSnapshot.docs.length;

  const roles = { students: 0, teachers: 0, admins: 0, parents: 0 };
  usersSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.role === 'student') roles.students++;
    else if (data.role === 'teacher') roles.teachers++;
    else if (data.role === 'admin') roles.admins++;
    else if (data.role === 'parent') roles.parents++;
  });

  const coursesSnapshot = await collections.courses().get();
  const totalCourses = coursesSnapshot.docs.length;

  const classesSnapshot = await collections.classes().get();
  const totalClasses = classesSnapshot.docs.length;

  const activeClassesSnapshot = await collections.classes()
    .where('status', '==', 'active')
    .get();
  const activeClasses = activeClassesSnapshot.docs.length;

  const publishedCoursesSnapshot = await collections.courses()
    .where('status', '==', 'published')
    .get();
  const publishedCourses = publishedCoursesSnapshot.docs.length;

  logger.info('Admin dashboard retrieved');

  return {
    totalUsers,
    totalStudents: roles.students,
    totalTeachers: roles.teachers,
    totalAdmins: roles.admins,
    totalParents: roles.parents,
    totalCourses,
    publishedCourses,
    totalClasses,
    activeClasses,
  };
}

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
  const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
  const totalPoints = grades.reduce((sum: number, g: any) => sum + (g.totalPoints || 1), 0);
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
