import { logger } from '../utils/logger';
import { checkUpcomingDeadlines } from './sendReminders.job';
import { cleanupExpiredData } from './cleanupExpired.job';
import { generateWeeklyReport, generateMonthlyReport } from './generateReports.job';
import { collections } from '../database/adapter';

const jobs: Map<string, NodeJS.Timeout> = new Map();

// ─── Overdue test checker ─────────────────────────────────────────────────────

async function checkOverdueTests(): Promise<void> {
  logger.info('Checking overdue tests...');

  try {
    const now = new Date().toISOString();

    // Check the V2 exam collection used by the lms (examV2)
    const snap = await collections.examV2()
      .where('endDate', '<', now)
      .get();

    if (snap.empty) return;

    for (const testDoc of snap.docs) {
      const testData = testDoc.data();
      const classId = testData.classId as string | undefined;
      const testTitle = (testData.title as string) || 'Test';
      const testId = testDoc.id;

      if (!classId) continue;

      try {
        // Get all students in the class
        const studentsSnap = await collections.users()
          .where('role', '==', 'student')
          .where('classIds', 'array-contains', classId)
          .get();

        if (studentsSnap.empty) continue;

        // Get existing submissions
        const attemptsSnap = await collections.examAttemptV2()
          .where('examId', '==', testId)
          .get();

        const submittedStudentIds = new Set(
          attemptsSnap.docs.map((d) => d.data().studentId as string),
        );

        const notSubmitted = studentsSnap.docs.filter((s) => !submittedStudentIds.has(s.id));
        if (notSubmitted.length === 0) continue;

        // Batch-write overdue notifications (skip if one already exists)
        const db = collections.notifications().firestore;
        const batch = db.batch();
        let batchCount = 0;

        for (const studentDoc of notSubmitted) {
          const existingSnap = await collections.notifications()
            .where('recipientId', '==', studentDoc.id)
            .where('type', '==', 'test_overdue')
            .where('metadata.testId', '==', testId)
            .limit(1)
            .get();

          if (!existingSnap.empty) continue;

          const notifRef = collections.notifications().doc();
          batch.set(notifRef, {
            recipientId: studentDoc.id,
            type: 'test_overdue',
            title: 'Test Overdue',
            body: `You have not submitted "${testTitle}". Please submit as soon as possible.`,
            metadata: { testId, testTitle },
            isRead: false,
            createdAt: new Date().toISOString(),
          });
          batchCount++;
        }

        if (batchCount > 0) {
          await batch.commit();
          logger.info('Overdue notifications sent', { testId, count: batchCount });
        }
      } catch (err) {
        logger.error('Failed to process overdue test', { testId, err });
      }
    }
  } catch (error) {
    logger.error('Overdue test check failed', error);
  }
}

// ─── Scheduler lifecycle ──────────────────────────────────────────────────────

export function startScheduler() {
  logger.info('Starting job scheduler...');

  const reminderJob = setInterval(
    () => {
      checkUpcomingDeadlines().catch((err) =>
        logger.error('Reminder job failed', err),
      );
    },
    30 * 60 * 1000,
  );
  jobs.set('sendReminders', reminderJob);

  const cleanupJob = setInterval(
    () => {
      cleanupExpiredData().catch((err) =>
        logger.error('Cleanup job failed', err),
      );
    },
    60 * 60 * 1000,
  );
  jobs.set('cleanupExpired', cleanupJob);

  // Overdue test checker — every 5 minutes
  const overdueJob = setInterval(
    () => {
      checkOverdueTests().catch((err) =>
        logger.error('Overdue test job failed', err),
      );
    },
    5 * 60 * 1000,
  );
  jobs.set('overdueTests', overdueJob);

  // Run overdue check once at startup after a short delay
  setTimeout(() => {
    checkOverdueTests().catch((err) =>
      logger.error('Initial overdue check failed', err),
    );
  }, 15_000);

  // Weekly report — check every hour, run if Monday
  const weeklyReportJob = setInterval(() => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 6) {
      generateWeeklyReport().catch(err => logger.error('Weekly report generation failed', err));
    }
  }, 60 * 60 * 1000);
  jobs.set('weeklyReport', weeklyReportJob);

  // Monthly report — check every hour, run if 1st of month
  const monthlyReportJob = setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 6) {
      generateMonthlyReport().catch(err => logger.error('Monthly report generation failed', err));
    }
  }, 60 * 60 * 1000);
  jobs.set('monthlyReport', monthlyReportJob);

  logger.info('Scheduler started with 5 jobs (sendReminders, cleanupExpired, overdueTests, weeklyReport, monthlyReport)');
}

export function stopScheduler() {
  for (const [name, interval] of jobs.entries()) {
    clearInterval(interval);
    logger.info(`Job ${name} stopped`);
  }
  jobs.clear();
}
