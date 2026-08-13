import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { computeMasteryInline } from '../services/adaptive/mastery.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const QAV2 = 'quizAttemptV2';
const EAV2 = 'examAttemptV2';
const QV2 = 'quizV2';
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

async function resolveQuizConcepts(quizData: Record<string, any>): Promise<string[]> {
  const direct = quizData.conceptId as string;
  if (direct) return [direct];
  const chapterId = quizData.chapterId as string;
  if (chapterId) {
    const { data } = await supabase.from('concepts').select('id').eq('chapter_id', chapterId);
    return (data || []).map((c: any) => c.id);
  }
  const subjectId = quizData.subjectId as string;
  if (subjectId) {
    const { data: textbooks } = await supabase.from('textbooks').select('id').eq('subject_id', subjectId);
    const textbookIds = (textbooks || []).map((t: any) => t.id);
    if (textbookIds.length === 0) return [];
    const { data: chapters } = await supabase.from('chapters').select('id').in('textbook_id', textbookIds);
    const chapterIds = (chapters || []).map((c: any) => c.id);
    if (chapterIds.length === 0) return [];
    const { data: concepts } = await supabase.from('concepts').select('id').in('chapter_id', chapterIds);
    return (concepts || []).map((c: any) => c.id);
  }
  return [];
}

async function resolveExamConcepts(examData: Record<string, any>): Promise<string[]> {
  const chapterId = examData.chapterId as string;
  if (!chapterId) return [];
  const { data } = await supabase.from('concepts').select('id').eq('chapter_id', chapterId);
  return (data || []).map((c: any) => c.id);
}

function isCompletedAttempt(a: Record<string, any>): boolean {
  const status = String(a.status || '').toLowerCase();
  return status === 'submitted' || status === 'completed' || (a.submittedAt && a.score != null);
}

async function main() {
  console.log('Fetching attempts...');
  const [quizAttempts, examAttempts] = await Promise.all([
    fetchCollection(QAV2),
    fetchCollection(EAV2),
  ]);
  console.log(`quizAttemptV2: ${quizAttempts.length}, examAttemptV2: ${examAttempts.length}`);

  const quizCompleted = quizAttempts.filter(isCompletedAttempt);
  const examCompleted = examAttempts.filter(isCompletedAttempt);
  console.log(`completed quiz attempts: ${quizCompleted.length}, completed exam attempts: ${examCompleted.length}`);

  let written = 0;
  let skippedNoQuiz = 0;
  let skippedNoConcepts = 0;
  let errors = 0;
  let zeroPoints = 0;

  for (const att of quizCompleted) {
    const quizId = (att.quizId || att.quiz_id) as string;
    const studentId = (att.studentId || att.student_id) as string;
    const totalPoints = Number(att.totalPoints) || 0;
    const score = Number(att.score) || 0;
    if (!quizId || !studentId) { skippedNoQuiz++; continue; }
    if (totalPoints <= 0) { zeroPoints++; continue; }

    const { data: quizRow } = await supabase
      .from('firestore_docs').select('data')
      .eq('collection', QV2).eq('doc_id', quizId).maybeSingle();
    if (!quizRow?.data) { skippedNoQuiz++; continue; }
    const quizData = quizRow.data as Record<string, any>;

    const concepts = await resolveQuizConcepts(quizData);
    if (concepts.length === 0) { skippedNoConcepts++; continue; }
    const accuracy = Math.min(Math.max(score / totalPoints, 0), 1);

    for (const cid of concepts) {
      try {
        await computeMasteryInline(studentId, cid, accuracy);
        written++;
      } catch (e: any) {
        errors++;
        console.log('  quiz mastery write failed', { studentId, conceptId: cid, err: e?.message });
      }
    }
  }

  for (const att of examCompleted) {
    const examId = (att.examId || att.exam_id) as string;
    const studentId = (att.studentId || att.student_id) as string;
    const totalPoints = Number(att.totalPoints) || 0;
    const score = Number(att.score) || 0;
    if (!examId || !studentId) { skippedNoQuiz++; continue; }
    if (totalPoints <= 0) { zeroPoints++; continue; }

    const { data: examRow } = await supabase
      .from('firestore_docs').select('data')
      .eq('collection', EV2).eq('doc_id', examId).maybeSingle();
    if (!examRow?.data) { skippedNoQuiz++; continue; }
    const examData = examRow.data as Record<string, any>;

    const concepts = await resolveExamConcepts(examData);
    if (concepts.length === 0) { skippedNoConcepts++; continue; }
    const accuracy = Math.min(Math.max(score / totalPoints, 0), 1);

    for (const cid of concepts) {
      try {
        await computeMasteryInline(studentId, cid, accuracy);
        written++;
      } catch (e: any) {
        errors++;
        console.log('  exam mastery write failed', { studentId, conceptId: cid, err: e?.message });
      }
    }
  }

  const { count } = await supabase.from('concept_mastery').select('*', { count: 'exact', head: true });
  console.log('--- summary ---');
  console.log('mastery rows written:', written);
  console.log('skipped (missing quiz/exam or id):', skippedNoQuiz);
  console.log('skipped (no resolvable concepts):', skippedNoConcepts);
  console.log('skipped (totalPoints = 0):', zeroPoints);
  console.log('errors:', errors);
  console.log('total concept_mastery rows now:', count);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('FATAL', e); process.exit(1); });