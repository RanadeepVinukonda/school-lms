import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { checkUpcomingDeadlines } from './sendReminders.job';
import { cleanupExpiredData, cleanupSoftDeletedRecords } from './cleanupExpired.job';
import { generateWeeklyReport, generateMonthlyReport } from './generateReports.job';
import { getSupabaseAdmin } from '../services/supabase';
import { TransactionManager } from '../database/transaction-manager';

const jobs: Map<string, NodeJS.Timeout> = new Map();

// ─── Overdue test checker ─────────────────────────────────────────────────────

async function checkOverdueTests(): Promise<void> {
  logger.info('Checking overdue tests...');

  try {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin()!;

    const { data: tests } = await supabase
      .from('firestore_docs')
      .select('doc_id, data')
      .eq('collection', 'examV2')
      .filter('data->>endDate', 'lt', now);

    if (!tests || tests.length === 0) return;

    for (const testRow of tests) {
      const testData = testRow.data as Record<string, unknown>;
      const classId = testData.classId as string | undefined;
      const testTitle = (testData.title as string) || 'Test';
      const testId = testRow.doc_id;

      if (!classId) continue;

      try {
        const { data: students } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'student')
          .contains('class_ids', [classId]);

        if (!students || students.length === 0) continue;

        const { data: attempts } = await supabase
          .from('firestore_docs')
          .select('data')
          .eq('collection', 'examAttemptV2')
          .contains('data', { examId: testId });

        const submittedStudentIds = new Set(
          (attempts || []).map((a) => (a.data as Record<string, unknown>).studentId as string),
        );

        const notSubmitted = students.filter((s) => !submittedStudentIds.has(s.id));
        if (notSubmitted.length === 0) continue;

        const entries: Array<{ id: string; data: Record<string, unknown> }> = [];

        for (const student of notSubmitted) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', student.id)
            .eq('type', 'test_overdue')
            .contains('data', { testId })
            .limit(1);

          if (existing && existing.length > 0) continue;

          entries.push({
            id: randomUUID(),
            data: {
              recipientId: student.id,
              type: 'test_overdue',
              title: 'Test Overdue',
              body: `You have not submitted "${testTitle}". Please submit as soon as possible.`,
              metadata: { testId, testTitle },
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          });
        }

        if (entries.length > 0) {
          const tm = new TransactionManager();
          await tm.runTransaction(async (tx) => {
            for (const e of entries) {
              tx.set('notifications', e.id, e.data);
            }
          });
          logger.info('Overdue notifications sent', { testId, count: entries.length });
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

  // Soft-delete cleanup — every 6 hours
  const softDeleteCleanup = setInterval(() => {
    cleanupSoftDeletedRecords().catch(err => logger.error('Soft-delete cleanup failed', err));
  }, 6 * 60 * 60 * 1000);
  jobs.set('softDeleteCleanup', softDeleteCleanup);

  logger.info('Scheduler started with 6 jobs (sendReminders, cleanupExpired, overdueTests, weeklyReport, monthlyReport, softDeleteCleanup)');
}

export function stopScheduler() {
  for (const [name, interval] of jobs.entries()) {
    clearInterval(interval);
    logger.info(`Job ${name} stopped`);
  }
  jobs.clear();
}
