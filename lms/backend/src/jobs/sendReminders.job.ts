import { collections } from '../firebase/firestore';
import { logger } from '../utils/logger';

export async function checkUpcomingDeadlines() {
  logger.info('Checking upcoming deadlines...');

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const assignmentsSnapshot = await collections.assignments()
      .where('dueDate', '>=', now.toISOString())
      .where('dueDate', '<=', in24Hours)
      .get();

    if (!assignmentsSnapshot.empty) {
      for (const doc of assignmentsSnapshot.docs) {
        const assignment = doc.data();
        const enrollmentsSnapshot = await collections.enrollment()
          .where('courseId', '==', assignment.courseId)
          .where('status', '==', 'active')
          .get();

        for (const enrollment of enrollmentsSnapshot.docs) {
          const enrollmentData = enrollment.data();
          await collections.notifications().add({
            userId: enrollmentData.studentId,
            type: 'assignment_reminder',
            title: 'Assignment Due Soon',
            body: `"${assignment.title}" is due within 24 hours`,
            data: {
              assignmentId: doc.id,
              courseId: assignment.courseId,
              dueDate: assignment.dueDate,
            },
            priority: 'high',
            read: false,
            readAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
      logger.info(`Sent ${assignmentsSnapshot.docs.length} assignment reminders`);
    }

    const examsSnapshot = await collections.exams()
      .where('startDate', '>=', now.toISOString())
      .where('startDate', '<=', in7Days)
      .get();

    if (!examsSnapshot.empty) {
      for (const doc of examsSnapshot.docs) {
        const exam = doc.data();
        const classIds = exam.scheduledClasses || [];

        for (const classId of classIds) {
          const studentsSnapshot = await collections.users()
            .where('classIds', 'array-contains', classId)
            .where('role', '==', 'student')
            .get();

          for (const student of studentsSnapshot.docs) {
            await collections.notifications().add({
              userId: student.id,
              type: 'exam_reminder',
              title: 'Upcoming Exam',
              body: `"${exam.title}" is scheduled soon`,
              data: {
                examId: doc.id,
                courseId: exam.courseId,
                startDate: exam.startDate,
              },
              priority: 'high',
              read: false,
              readAt: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      logger.info(`Sent ${examsSnapshot.docs.length} exam reminders`);
    }
  } catch (error) {
    logger.error('Failed to send reminders', error);
  }
}
