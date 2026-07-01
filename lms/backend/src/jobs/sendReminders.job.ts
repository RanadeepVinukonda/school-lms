import { collections, getCollection } from '../database/adapter';
import { logger } from '../utils/logger';

const SENT_REMINDERS_COLLECTION = 'sentReminders';

async function hasReminderBeenSent(type: string, refId: string, userId: string): Promise<boolean> {
  const docRef = getCollection(SENT_REMINDERS_COLLECTION)
    .doc(`${type}_${refId}_${userId}`);
  const snap = await docRef.get();
  return snap.exists;
}

async function markReminderSent(type: string, refId: string, userId: string): Promise<void> {
  const docRef = getCollection(SENT_REMINDERS_COLLECTION)
    .doc(`${type}_${refId}_${userId}`);
  await docRef.set({
    type,
    refId,
    userId,
    sentAt: new Date().toISOString(),
  });
}

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
          const reminderType = 'assignment_reminder';
          if (await hasReminderBeenSent(reminderType, doc.id, enrollmentData.studentId)) {
            continue;
          }
          await collections.notifications().add({
            userId: enrollmentData.studentId,
            type: reminderType,
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
          await markReminderSent(reminderType, doc.id, enrollmentData.studentId);
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
            const reminderType = 'exam_reminder';
            if (await hasReminderBeenSent(reminderType, doc.id, student.id)) {
              continue;
            }
            await collections.notifications().add({
              userId: student.id,
              type: reminderType,
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
            await markReminderSent(reminderType, doc.id, student.id);
          }
        }
      }
      logger.info(`Sent ${examsSnapshot.docs.length} exam reminders`);
    }
  } catch (error) {
    logger.error('Failed to send reminders', error);
  }
}
