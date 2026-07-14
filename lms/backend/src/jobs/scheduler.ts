// @ts-nocheck — pre-existing type errors
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { checkUpcomingDeadlines } from './sendReminders.job';
import { cleanupExpiredData, cleanupSoftDeletedRecords } from './cleanupExpired.job';
import { generateWeeklyReport, generateMonthlyReport } from './generateReports.job';
import { getSupabaseAdmin } from '../services/supabase';
import { TransactionManager } from '../database/transaction-manager';

const timers: Map<string, ReturnType<typeof setInterval>> = new Map();

export async function checkOverdueTests(): Promise<void> {
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

export async function startScheduler(): Promise<void> {
  logger.info('Starting job scheduler (setInterval-based, 6 timers)...');

  timers.set('sendReminders', setInterval(() => {
    checkUpcomingDeadlines().catch(err => logger.error('sendReminders failed', err));
  }, 30 * 60 * 1000));

  timers.set('cleanupExpired', setInterval(() => {
    cleanupExpiredData().catch(err => logger.error('cleanupExpired failed', err));
  }, 60 * 60 * 1000));

  timers.set('overdueTests', setInterval(() => {
    checkOverdueTests().catch(err => logger.error('overdueTests failed', err));
  }, 5 * 60 * 1000));

  setTimeout(() => {
    checkOverdueTests().catch(err => logger.error('Initial overdue check failed', err));
  }, 15_000);

  timers.set('weeklyReport', setInterval(() => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 6) {
      generateWeeklyReport().catch(err => logger.error('weeklyReport failed', err));
    }
  }, 60 * 60 * 1000));

  timers.set('monthlyReport', setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 6) {
      generateMonthlyReport().catch(err => logger.error('monthlyReport failed', err));
    }
  }, 60 * 60 * 1000));

  timers.set('softDeleteCleanup', setInterval(() => {
    cleanupSoftDeletedRecords().catch(err => logger.error('softDeleteCleanup failed', err));
  }, 6 * 60 * 60 * 1000));

  logger.info('Scheduler started with 6 setInterval timers');
}

export async function stopScheduler(): Promise<void> {
  for (const [name, timer] of timers.entries()) {
    clearInterval(timer);
    logger.info(`Timer ${name} stopped`);
  }
  timers.clear();
}
