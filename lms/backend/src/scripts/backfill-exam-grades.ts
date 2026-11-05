import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const EAV2 = 'examAttemptV2';
const EV2 = 'examV2';

const CHUNK = 200;

async function fetchCollection(col: string): Promise<Array<Record<string, any>>> {
  const out: Array<Record<string, any>> = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('firestore_docs')
      .select('doc_id, data')
      .eq('collection', col)
      .order('created_at', { ascending: true })
      .range(offset, offset + CHUNK - 1);
    if (error) throw new Error(`${col} fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) out.push({ id: r.doc_id, ...(r.data as object) });
    if (data.length < CHUNK) break;
    offset += CHUNK;
  }
  return out;
}

function isCompletedAttempt(a: Record<string, any>): boolean {
  const status = String(a.status || '').toLowerCase();
  return status === 'submitted' || status === 'completed' || (a.submittedAt && a.score != null);
}

async function resolveSubjectId(examData: Record<string, any>): Promise<string | null> {
  if (examData.subjectId) return examData.subjectId as string;
  const textbookId = examData.textbookId as string;
  if (!textbookId) return null;
  const { data: tbRow } = await supabase.from('textbooks').select('subject_id').eq('id', textbookId).maybeSingle();
  return (tbRow as any)?.subject_id || null;
}

async function alreadyGradedAttemptIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', 'grades')
      .not('data->>attemptId', 'is', null)
      .range(offset, offset + CHUNK - 1);
    if (error) throw new Error(`grades fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const aid = (r.data as any)?.attemptId;
      if (aid) ids.add(String(aid));
    }
    if (data.length < CHUNK) break;
    offset += CHUNK;
  }
  return ids;
}

async function insertGrade(payload: Record<string, any>): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('firestore_docs').insert({
    collection: 'grades',
    doc_id: uuidv4(),
    data: { ...payload, createdAt: payload.createdAt || nowIso, updatedAt: nowIso },
  });
  if (error) {
    console.log('  insert failed:', error.message);
    return false;
  }
  return true;
}

async function main() {
  console.log('Fetching exam attempts and existing grade links...');
  const [examAttempts, gradedIds] = await Promise.all([
    fetchCollection(EAV2),
    alreadyGradedAttemptIds(),
  ]);
  const examCompleted = examAttempts.filter(isCompletedAttempt);
  console.log(`examAttemptV2 total: ${examAttempts.length}, completed: ${examCompleted.length}, attempts already linked to grades: ${gradedIds.size}`);

  // Legacy teacher-graded attempts (physical table).
  const { data: legacyGraded, error: legacyErr } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, student_id, score, total_points, class_id, graded_at')
    .eq('status', 'graded');
  if (legacyErr) console.log('legacy exam_attempts fetch failed:', legacyErr.message);
  const legacyRows = legacyGraded || [];
  console.log(`legacy graded exam_attempts: ${legacyRows.length}`);

  let written = 0;
  let skippedExisting = 0;
  let skippedNoExam = 0;
  let zeroPoints = 0;
  let errors = 0;

  const examCache = new Map<string, Record<string, any> | null>();

  for (const att of examCompleted) {
    const attemptId = String(att.id);
    const examId = (att.examId || att.exam_id) as string;
    const studentId = (att.studentId || att.student_id) as string;
    const score = Number(att.score) || 0;
    const totalPoints = Number(att.totalPoints) || 0;
    if (!examId || !studentId) { skippedNoExam++; continue; }
    if (gradedIds.has(attemptId)) { skippedExisting++; continue; }
    if (totalPoints <= 0) { zeroPoints++; continue; }

    if (!examCache.has(examId)) {
      const { data: examRow } = await supabase
        .from('firestore_docs').select('data')
        .eq('collection', EV2).eq('doc_id', examId).maybeSingle();
      examCache.set(examId, (examRow?.data as Record<string, any>) || null);
    }
    const examData = examCache.get(examId);
    if (!examData) { skippedNoExam++; continue; }

    const subjectId = await resolveSubjectId(examData);
    const ok = await insertGrade({
      studentId,
      courseId: examData.courseId || null,
      subjectId,
      classId: examData.classId || null,
      itemName: examData.title || 'Exam',
      score,
      totalPoints,
      percentage: Math.round((score / totalPoints) * 100),
      gradedBy: 'auto',
      attemptId,
      createdAt: (att.submittedAt as string) || undefined,
    });
    if (ok) { written++; gradedIds.add(attemptId); } else { errors++; }
  }

  const legacyExamCache = new Map<string, Record<string, any> | null>();
  for (const att of legacyRows) {
    const attemptId = String(att.id);
    const studentId = att.student_id as string;
    const score = Number(att.score) || 0;
    const totalPoints = Number(att.total_points) || 0;
    if (!studentId) { skippedNoExam++; continue; }
    if (gradedIds.has(attemptId)) { skippedExisting++; continue; }
    if (totalPoints <= 0) { zeroPoints++; continue; }

    if (!legacyExamCache.has(att.exam_id as string)) {
      const { data: examRow } = await supabase
        .from('exams').select('*')
        .eq('id', att.exam_id as string)
        .maybeSingle();
      legacyExamCache.set(att.exam_id as string, (examRow as Record<string, any>) || null);
    }
    const exam = legacyExamCache.get(att.exam_id as string)!;
    let subjectId: string | null = exam?.subject_id || exam?.subjectId || null;
    if (!subjectId && (exam?.textbook_id || exam?.textbookId)) {
      const { data: tbRow } = await supabase.from('textbooks').select('subject_id').eq('id', exam.textbook_id || exam.textbookId).maybeSingle();
      subjectId = (tbRow as any)?.subject_id || null;
    }

    const ok = await insertGrade({
      studentId,
      courseId: exam?.course_id || exam?.courseId || null,
      subjectId,
      classId: att.class_id || exam?.class_id || exam?.classId || null,
      itemName: exam?.title || 'Exam',
      score,
      totalPoints,
      percentage: Math.round((score / totalPoints) * 100),
      gradedBy: 'teacher',
      attemptId,
      createdAt: (att.graded_at as string) || undefined,
    });
    if (ok) { written++; gradedIds.add(attemptId); } else { errors++; }
  }

  console.log('--- summary ---');
  console.log('grade records written:', written);
  console.log('skipped (already graded):', skippedExisting);
  console.log('skipped (missing exam/student):', skippedNoExam);
  console.log('skipped (totalPoints = 0):', zeroPoints);
  console.log('errors:', errors);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('FATAL', e); process.exit(1); });
