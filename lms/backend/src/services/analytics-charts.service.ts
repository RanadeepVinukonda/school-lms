import { getSupabaseAdmin } from './supabase';
import { getSettings } from './settings.service';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export async function getConceptsForClass(classId: string) {
  const allItems = await getConceptOversight();
  return allItems.filter((item) => item.classId === classId);
}

export async function getConceptOversight() {
  const supabase = getSupabaseAdmin()!;

  const { data: tcsDocs, error: tcsDocsErr } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', 'teacherClassSubject');
  if (tcsDocsErr) throw new Error(tcsDocsErr.message);
  const assignments = (tcsDocs || []).map((d: any) => ({ id: d.doc_id, ...d.data }));
  if (assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a: any) => a.classId))];
  const subjectIds = [...new Set(assignments.map((a: any) => a.subjectId))];
  const teacherIds = [...new Set(assignments.map((a: any) => a.teacherId))];

  const [classesRes, subjectsRes, teachersRes, textbooksRes] = await Promise.all([
    classIds.length > 0 ? supabase.from('classes').select('id, name').in('id', classIds) : { data: [], error: null },
    subjectIds.length > 0 ? supabase.from('subjects').select('id, name').in('id', subjectIds) : { data: [], error: null },
    teacherIds.length > 0 ? supabase.from('users').select('id, display_name').in('id', teacherIds) : { data: [], error: null },
    supabase.from('textbooks').select('id, class_id, subject_id'),
  ]);
  for (const r of [classesRes, subjectsRes, teachersRes]) { if (r.error) throw new Error(r.error.message); }

  const classMap = new Map((classesRes.data || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s.name]));
  const teacherMap = new Map((teachersRes.data || []).map((t: any) => [t.id, t.display_name]));

  const textbookByClassSubject = new Map<string, string>();
  for (const tb of (textbooksRes.data || [])) {
    if (tb.class_id && tb.subject_id) textbookByClassSubject.set(`${tb.class_id}|${tb.subject_id}`, tb.id);
  }

  const resolved = assignments.map((a: any) => ({
    ...a,
    textbookId: a.textbookId || textbookByClassSubject.get(`${a.classId}|${a.subjectId}`),
  })).filter((a: any) => a.textbookId);

  const textbookIds = [...new Set(resolved.map((a: any) => a.textbookId))];

  const { data: allChapters } = textbookIds.length > 0
    ? await supabase.from('chapters').select('id, textbook_id').in('textbook_id', textbookIds)
    : { data: [] };
  const chapterIds = [...new Set((allChapters || []).map((c: any) => c.id))];
  const chapterByTextbook = new Map<string, string[]>();
  for (const ch of (allChapters || [])) {
    if (!chapterByTextbook.has(ch.textbook_id)) chapterByTextbook.set(ch.textbook_id, []);
    chapterByTextbook.get(ch.textbook_id)?.push(ch.id);
  }

  const { data: allConcepts } = chapterIds.length > 0
    ? await supabase.from('concepts').select('id, title, chapter_id').in('chapter_id', chapterIds)
    : { data: [] };
  const conceptByChapter = new Map<string, { id: string; title: string }[]>();
  for (const c of (allConcepts || [])) {
    if (!conceptByChapter.has(c.chapter_id)) conceptByChapter.set(c.chapter_id, []);
    conceptByChapter.get(c.chapter_id)?.push(c);
  }

  const { data: allQuizDocs } = await supabase
    .from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'quizV2');
  const allQuizIds = (allQuizDocs || []).map((d: any) => d.doc_id);

  const { data: allAssignmentDocs } = await supabase
    .from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'assignmentV2');
  const allAssignmentIds = (allAssignmentDocs || []).map((d: any) => d.doc_id);

  const [allQuizAttempts, allSubmissions] = await Promise.all([
    allQuizIds.length > 0
      ? supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2')
      : { data: [] },
    allAssignmentIds.length > 0
      ? supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2')
      : { data: [] },
  ]);

  const quizAttemptByQuizId = new Map<string, number[]>();
  for (const d of (allQuizAttempts.data || [])) {
    const qid = d.data?.quizId;
    if (!qid) continue;
    if (!quizAttemptByQuizId.has(qid)) quizAttemptByQuizId.set(qid, []);
    const pct = d.data?.percentage;
    if (pct != null) quizAttemptByQuizId.get(qid)?.push(pct);
  }

  const subByAssignmentId = new Map<string, number[]>();
  for (const d of (allSubmissions.data || [])) {
    const aid = d.data?.assignmentId;
    if (!aid) continue;
    if (!subByAssignmentId.has(aid)) subByAssignmentId.set(aid, []);
    const pct = d.data?.percentage;
    if (pct != null) subByAssignmentId.get(aid)?.push(pct);
  }

  const quizByConceptClass = new Map<string, string[]>();
  for (const d of (allQuizDocs || [])) {
    const key = `${d.data?.classId}|${d.data?.conceptId}`;
    if (!quizByConceptClass.has(key)) quizByConceptClass.set(key, []);
    quizByConceptClass.get(key)?.push(d.doc_id);
  }
  const assignByConceptClass = new Map<string, string[]>();
  for (const d of (allAssignmentDocs || [])) {
    const key = `${d.data?.classId}|${d.data?.conceptId}`;
    if (!assignByConceptClass.has(key)) assignByConceptClass.set(key, []);
    assignByConceptClass.get(key)?.push(d.doc_id);
  }

  const settings = await getSettings();
  const threshold = settings.conceptFlaggingThreshold ?? 50;
  const oversightItems: any[] = [];

  for (const assignment of resolved) {
    const tcsChapters = chapterByTextbook.get(assignment.textbookId) || [];
    for (const chapId of tcsChapters) {
      const concepts = conceptByChapter.get(chapId) || [];
      for (const concept of concepts) {
        const ck = `${assignment.classId}|${concept.id}`;
        const quizIds = quizByConceptClass.get(ck) || [];
        const assignIds = assignByConceptClass.get(ck) || [];

        const quizPercentages: number[] = [];
        for (const qid of quizIds) {
          const pcts = quizAttemptByQuizId.get(qid);
          if (pcts) quizPercentages.push(...pcts);
        }
        const assignPercentages: number[] = [];
        for (const aid of assignIds) {
          const pcts = subByAssignmentId.get(aid);
          if (pcts) assignPercentages.push(...pcts);
        }

        const allScores = [...quizPercentages, ...assignPercentages];
        const attemptCount = allScores.length;
        const averageScore = attemptCount > 0
          ? safePct(Math.round(allScores.reduce((sum, val) => sum + val, 0) / attemptCount))
          : 0;

        oversightItems.push({
          classId: assignment.classId,
          className: classMap.get(assignment.classId) || 'Unknown Class',
          subjectId: assignment.subjectId,
          subjectName: subjectMap.get(assignment.subjectId) || 'Unknown Subject',
          conceptId: concept.id,
          conceptName: concept.title || 'Unknown Concept',
          section: assignment.section || '',
          averageScore,
          attemptCount,
          quizCount: quizIds.length,
          taskCount: assignIds.length,
          teacherName: teacherMap.get(assignment.teacherId) || 'Unknown Teacher',
          teacherId: assignment.teacherId,
          status: (attemptCount > 0 && averageScore < threshold) ? 'low' : 'normal',
          threshold,
        });
      }
    }
  }

  return oversightItems;
}

export async function getConductedTests() {
  const supabase = getSupabaseAdmin()!;

  const [quizRes, examRes, assignmentRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
    supabase.from('firestore_docs').select('data, doc_id').eq('collection', 'quizV2'),
    supabase.from('firestore_docs').select('data, doc_id').eq('collection', 'examV2'),
    supabase.from('firestore_docs').select('data, doc_id').eq('collection', 'assignmentV2'),
    supabase.from('classes').select('id, name'),
    supabase.from('subjects').select('id, name'),
    supabase.from('users').select('id, display_name, email').in('role', ['teacher', 'admin']),
  ]);
  for (const res of [quizRes, examRes, assignmentRes, classesRes, subjectsRes, teachersRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const classMap = new Map((classesRes.data || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s.name]));
  const teacherMap = new Map((teachersRes.data || []).map((t: any) => [t.id, t.display_name || t.email]));

  const { data: conceptRows } = await supabase.from('concepts').select('id, title');
  const conceptMap = new Map((conceptRows || []).map((c: any) => [c.id, c.title || 'Unknown Concept']));

  const [quizAttemptsRes, examAttemptsRes, subsRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  const attemptPercentages = new Map<string, number[]>();
  for (const d of (quizAttemptsRes.data || [])) { const id = d.data?.quizId; if (id) { if (!attemptPercentages.has(id)) attemptPercentages.set(id, []); const p = d.data?.percentage; if (p != null) attemptPercentages.get(id)?.push(p); } }
  for (const d of (examAttemptsRes.data || [])) { const id = d.data?.examId; if (id) { if (!attemptPercentages.has(id)) attemptPercentages.set(id, []); const p = d.data?.percentage; if (p != null) attemptPercentages.get(id)?.push(p); } }
  for (const d of (subsRes.data || [])) { const id = d.data?.assignmentId; if (id) { if (!attemptPercentages.has(id)) attemptPercentages.set(id, []); const p = d.data?.percentage; if (p != null) attemptPercentages.get(id)?.push(p); } }

  function buildTest(doc: any, type: string) {
    const d = doc.data as any;
    const pcts = attemptPercentages.get(doc.doc_id) || [];
    const total = pcts.length;
    const avg = total > 0 ? safePct(Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / total)) : 0;
    return {
      id: doc.doc_id,
      type,
      title: d.title,
      classId: d.classId,
      className: classMap.get(d.classId) || 'Unknown Class',
      subjectId: d.subjectId,
      subjectName: subjectMap.get(d.subjectId) || 'Unknown Subject',
      teacherId: d.teacherId,
      teacherName: teacherMap.get(d.teacherId) || 'Unknown Teacher',
      conceptId: d.conceptId,
      conceptName: conceptMap.get(d.conceptId) || 'General',
      examDate: d.examDate || d.createdAt || new Date().toISOString(),
      releasedAt: d.releasedAt,
      attemptCount: total,
      averageScore: avg,
    };
  }

  const results: any[] = [];
  for (const doc of (quizRes.data || [])) results.push(buildTest(doc, 'Quiz'));
  for (const doc of (examRes.data || [])) results.push(buildTest(doc, 'Exam'));
  for (const doc of (assignmentRes.data || [])) results.push(buildTest(doc, 'Assignment'));

  return results;
}
