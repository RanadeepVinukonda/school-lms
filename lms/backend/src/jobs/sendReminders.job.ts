import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

const SENT_REMINDERS_COLLECTION = 'sentReminders';

async function hasReminderBeenSent(type: string, refId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()!;
  const docId = `${type}_${refId}_${userId}`;
  const { data } = await supabase
    .from('nosql_docs')
    .select('doc_id')
    .eq('collection', SENT_REMINDERS_COLLECTION)
    .eq('doc_id', docId)
    .maybeSingle();
  return !!data;
}

async function markReminderSent(type: string, refId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()!;
  const docId = `${type}_${refId}_${userId}`;
  const { error } = await supabase.from('nosql_docs').upsert({
    collection: SENT_REMINDERS_COLLECTION,
    doc_id: docId,
    data: { type, refId, userId, sentAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

export async function checkUpcomingDeadlines() {
  logger.info('Checking upcoming deadlines...');

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const supabase = getSupabaseAdmin()!;

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, course_id, due_date')
      .gte('dueDate', now.toISOString())
      .lte('dueDate', in24Hours);

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        const { data: enrollments } = await supabase
          .from('nosql_docs')
          .select('doc_id, data')
          .eq('collection', 'enrollment')
          .contains('data', { courseId: assignment.course_id, status: 'active' });

        if (!enrollments) continue;

        for (const enrollment of enrollments) {
          const ed = enrollment.data as Record<string, unknown>;
          const studentId = ed.studentId as string;
          const reminderType = 'assignment_reminder';
          if (await hasReminderBeenSent(reminderType, assignment.id, studentId)) {
            continue;
          }
          const { error } = await supabase.from('notifications').insert({
            id: randomUUID(),
            user_id: studentId,
            type: reminderType,
            title: 'Assignment Due Soon',
            body: `"${assignment.title}" is due within 24 hours`,
            data: { assignmentId: assignment.id, courseId: assignment.course_id, dueDate: assignment.due_date },
            priority: 'high',
            read: false,
            read_at: null,
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
          await markReminderSent(reminderType, assignment.id, studentId);
        }
      }
      logger.info(`Sent ${assignments.length} assignment reminders`);
    }

    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, course_id, start_date, scheduled_classes')
      .gte('startDate', now.toISOString())
      .lte('startDate', in7Days);

    if (exams && exams.length > 0) {
      for (const exam of exams) {
        const classIds: string[] = exam.scheduled_classes || (exam as any).scheduledClasses || [];

        for (const classId of classIds) {
          const { data: students } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'student')
            .contains('class_ids', [classId]);

          if (!students) continue;

          for (const student of students) {
            const reminderType = 'exam_reminder';
            if (await hasReminderBeenSent(reminderType, exam.id, student.id)) {
              continue;
            }
            const { error } = await supabase.from('notifications').insert({
              id: randomUUID(),
              user_id: student.id,
              type: reminderType,
              title: 'Upcoming Exam',
              body: `"${exam.title}" is scheduled soon`,
              data: { examId: exam.id, courseId: exam.course_id, startDate: exam.start_date },
              priority: 'high',
              read: false,
              read_at: null,
              created_at: new Date().toISOString(),
            });
            if (error) throw error;
            await markReminderSent(reminderType, exam.id, student.id);
          }
        }
      }
      logger.info(`Sent ${exams.length} exam reminders`);
    }
  } catch (error) {
    logger.error('Failed to send reminders', error);
  }
}
