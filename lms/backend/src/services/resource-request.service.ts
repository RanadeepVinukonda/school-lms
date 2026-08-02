import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { searchTeachResources } from './teach-resources.service';
import { sendNotificationToTargets, createNotification } from './notification.service';
import type { TeachResource } from './teach-resources.service';

const supabase = () => getSupabaseAdmin();

export interface ResourceRequestRow {
  id: string;
  student_id: string;
  studentName?: string;
  concept_id: string;
  textbook_id: string | null;
  chapter_id: string | null;
  subject_id: string | null;
  subject_name: string;
  concept_title: string;
  chapter_title: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  declined_reason: string;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConceptContext {
  conceptId: string;
  conceptTitle: string;
  textbookId: string;
  chapterId: string;
  chapterTitle: string;
  subjectId: string | null;
  subjectName: string;
  schoolId: string | null;
}

async function getConceptContext(conceptId: string): Promise<ConceptContext> {
  const db = supabase();
  const { data: concept, error } = await db
    .from('concepts')
    .select('id, title, textbook_id, chapter_id, school_id')
    .eq('id', conceptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!concept) throw new NotFoundError('Concept not found');

  let textbookId = concept.textbook_id as string;
  let chapterId = concept.chapter_id as string;

  const { data: textbook } = textbookId
    ? await db.from('textbooks').select('id, subject_id').eq('id', textbookId).maybeSingle()
    : { data: null };
  const { data: chapter } = chapterId
    ? await db.from('chapters').select('id, title').eq('id', chapterId).maybeSingle()
    : { data: null };

  let subjectId: string | null = textbook?.subject_id as string | null || null;
  let subjectName = '';
  if (subjectId) {
    const { data: subject } = await db.from('subjects').select('name').eq('id', subjectId).maybeSingle();
    subjectName = subject?.name as string || '';
  }

  return {
    conceptId: concept.id as string,
    conceptTitle: concept.title as string,
    textbookId,
    chapterId,
    chapterTitle: chapter?.title as string || '',
    subjectId,
    subjectName,
    schoolId: concept.school_id as string | null || null,
  };
}

async function getWeakConcepts(studentId: string): Promise<Array<{ conceptId: string; masteryScore: number; attemptCount: number; lastReviewedAt: string | null }>> {
  const db = supabase();
  const { data: lowMastery, error } = await db
    .from('concept_mastery')
    .select('concept_id, mastery_score, attempt_count, last_reviewed_at')
    .eq('student_id', studentId)
    .lt('mastery_score', 0.7)
    .order('mastery_score', { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return (lowMastery || []).map((c: any) => ({
    conceptId: c.concept_id,
    masteryScore: c.mastery_score as number,
    attemptCount: c.attempt_count as number,
    lastReviewedAt: c.last_reviewed_at as string | null,
  }));
}

async function getExistingRequests(studentId: string, conceptIds: string[]): Promise<Map<string, 'pending' | 'approved'>> {
  if (conceptIds.length === 0) return new Map();
  const db = supabase();
  const { data, error } = await db
    .from('resource_requests')
    .select('concept_id, status')
    .eq('student_id', studentId)
    .in('concept_id', conceptIds)
    .in('status', ['pending', 'approved']);
  if (error) throw new Error(error.message);
  const map = new Map<string, 'pending' | 'approved'>();
  for (const r of data || []) {
    if (!map.has(r.concept_id)) map.set(r.concept_id, r.status as 'pending' | 'approved');
  }
  return map;
}

/** Concepts the student scored low on (from exams), enriched with context + request status. */
export async function getStudentRecommendations(studentId: string) {
  const weak = await getWeakConcepts(studentId);
  const contexts = await Promise.all(weak.map((w) => getConceptContext(w.conceptId)));
  const existing = await getExistingRequests(studentId, weak.map((w) => w.conceptId));

  return contexts.map((ctx, i) => {
    const w = weak[i];
    return {
      ...ctx,
      masteryScore: w.masteryScore,
      attemptCount: w.attemptCount,
      lastReviewedAt: w.lastReviewedAt,
      requestStatus: existing.get(ctx.conceptId) || 'none',
      reason: `Needs practice (mastery: ${Math.round(w.masteryScore * 100)}%)`,
    };
  });
}

/** Student requests curated resources for a concept they scored low on. */
export async function createResourceRequest(input: {
  studentId: string;
  conceptId: string;
  reason?: string;
}) {
  const ctx = await getConceptContext(input.conceptId);

  const { data: existing } = await supabase()
    .from('resource_requests')
    .select('id, status')
    .eq('student_id', input.studentId)
    .eq('concept_id', input.conceptId)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) throw new ValidationError('You already have a pending request for this concept');

  const { data: inserted, error } = await supabase()
    .from('resource_requests')
    .insert({
      student_id: input.studentId,
      concept_id: ctx.conceptId,
      textbook_id: ctx.textbookId || null,
      chapter_id: ctx.chapterId || null,
      subject_id: ctx.subjectId,
      subject_name: ctx.subjectName,
      concept_title: ctx.conceptTitle,
      chapter_title: ctx.chapterTitle,
      reason: input.reason || '',
      school_id: ctx.schoolId,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create resource request: ${error.message}`);

  const requestId = (inserted as ResourceRequestRow).id;
  try {
    await notifyRelevantTeachers({
      requestId,
      studentId: input.studentId,
      subjectId: ctx.subjectId,
      subjectName: ctx.subjectName,
      conceptTitle: ctx.conceptTitle,
      schoolId: ctx.schoolId,
    });
  } catch (notifyErr) {
    logger.error('Resource request teacher notify failed', { requestId, error: (notifyErr as Error).message });
  }

  return inserted as ResourceRequestRow;
}

async function notifyRelevantTeachers(input: {
  requestId: string;
  studentId: string;
  subjectId: string | null;
  subjectName: string;
  conceptTitle: string;
  schoolId: string | null;
}) {
  const db = supabase();
  let teacherIds: string[] = [];

  if (input.subjectId) {
    // Prefer teachers assigned to this subject; fall back to any teacher of the student's classes.
    const { data: subjectTeachers } = await db
      .from('teacher_class_subject_assignments')
      .select('teacher_id')
      .eq('subject_id', input.subjectId)
      .eq('status', 'active');
    teacherIds = [...new Set((subjectTeachers || []).map((t: any) => t.teacher_id as string))];
  }

  if (teacherIds.length === 0 && input.schoolId) {
    const { data: schoolTeachers } = await db
      .from('users')
      .select('id')
      .eq('role', 'teacher')
      .eq('school_id', input.schoolId)
      .eq('is_active', true);
    teacherIds = (schoolTeachers || []).map((t: any) => t.id as string);
  }

  if (teacherIds.length === 0) {
    logger.info('No teachers to notify for resource request', { requestId: input.requestId });
    return;
  }

  await sendNotificationToTargets({
    type: 'resource_request',
    title: 'Resource request',
    body: `${input.conceptTitle}${input.subjectName ? ` (${input.subjectName})` : ''} — a student needs curated resources`,
    data: { requestId: input.requestId },
    link: '/teacher/resource-requests',
    userIds: teacherIds,
    schoolId: input.schoolId || undefined,
  });
}

/** The student's own requests, newest first. */
export async function listStudentRequests(studentId: string) {
  const { data, error } = await supabase()
    .from('resource_requests')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as ResourceRequestRow[];
}

/** Pending requests a teacher can act on (school-scoped, subject-prioritized). */
export async function listTeacherRequests(teacherId: string, schoolId: string | null) {
  const db = supabase();

  const { data: assignments } = await db
    .from('teacher_class_subject_assignments')
    .select('subject_id')
    .eq('teacher_id', teacherId)
    .eq('status', 'active');
  const subjectIds = [...new Set((assignments || []).map((a: any) => a.subject_id as string))];

  let query = db
    .from('resource_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let requests = (data || []) as ResourceRequestRow[];

  if (subjectIds.length > 0) {
    const prioritized = requests.filter((r) => r.subject_id && subjectIds.includes(r.subject_id));
    const others = requests.filter((r) => !r.subject_id || !subjectIds.includes(r.subject_id));
    requests = [...prioritized, ...others];
  }

  if (requests.length > 0) {
    const { data: students } = await db
      .from('users')
      .select('id, display_name')
      .in('id', requests.map((r) => r.student_id));
    const nameMap = new Map((students || []).map((s: any) => [s.id as string, s.display_name as string]));
    requests = requests.map((r) => ({ ...r, studentName: nameMap.get(r.student_id) || 'Student' }));
  }

  return requests;
}

/** Teacher approves a request and pushes curated resources to the student. */
export async function approveResourceRequest(input: {
  requestId: string;
  teacherId: string;
  resources: TeachResource[];
}) {
  if (!input.resources || input.resources.length === 0) {
    throw new ValidationError('Provide at least one resource to push');
  }

  const { data: request } = await supabase()
    .from('resource_requests')
    .select('*')
    .eq('id', input.requestId)
    .maybeSingle();
  if (!request) throw new NotFoundError('Request not found');
  if (request.status !== 'pending') throw new ValidationError('Request is no longer pending');

  const rows = input.resources.map((r) => ({
    student_id: request.student_id,
    request_id: input.requestId,
    concept_id: request.concept_id || null,
    textbook_id: request.textbook_id || null,
    chapter_id: request.chapter_id || null,
    subject_id: request.subject_id || null,
    subject_name: request.subject_name || '',
    concept_title: request.concept_title || '',
    title: r.title,
    url: r.url || '',
    source: r.source || '',
    source_label: r.sourceLabel || '',
    thumbnail: r.thumbnail || '',
    duration: r.duration || '',
    channel_name: r.channelName || '',
    description: r.description || '',
    embed_url: r.embedUrl || '',
    video_id: r.videoId || '',
    pushed_by: input.teacherId,
    school_id: request.school_id || null,
  }));

  const { error: insertErr } = await supabase().from('student_resources').insert(rows);
  if (insertErr) throw new Error(`Failed to save resources: ${insertErr.message}`);

  const { error: updateErr } = await supabase()
    .from('resource_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', input.requestId);
  if (updateErr) throw new Error(`Failed to update request: ${updateErr.message}`);

  try {
    await createNotification({
      userId: request.student_id,
      type: 'resource_approved',
      title: 'Resources ready for you',
      body: `Your teacher shared ${input.resources.length} resource${input.resources.length > 1 ? 's' : ''} for ${request.concept_title || 'this concept'}. Watch them in Resources.`,
      data: { requestId: input.requestId, conceptId: request.concept_id },
      link: '/student/resources',
      schoolId: request.school_id || undefined,
    });
  } catch (notifyErr) {
    logger.error('Resource approved notify failed', { requestId: input.requestId, error: (notifyErr as Error).message });
  }

  return { ...request, status: 'approved' } as ResourceRequestRow;
}

/** Teacher declines a request with a reason. */
export async function declineResourceRequest(input: {
  requestId: string;
  teacherId: string;
  reason?: string;
}) {
  const { data: request } = await supabase()
    .from('resource_requests')
    .select('*')
    .eq('id', input.requestId)
    .maybeSingle();
  if (!request) throw new NotFoundError('Request not found');
  if (request.status !== 'pending') throw new ValidationError('Request is no longer pending');

  const reason = input.reason?.trim() || 'Not approved at this time';
  const { error } = await supabase()
    .from('resource_requests')
    .update({ status: 'declined', declined_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', input.requestId);
  if (error) throw new Error(`Failed to decline request: ${error.message}`);

  try {
    await createNotification({
      userId: request.student_id,
      type: 'resource_declined',
      title: 'Resource request declined',
      body: `Your request for ${request.concept_title || 'this concept'} was declined.`,
      data: { requestId: input.requestId, conceptId: request.concept_id, reason },
      link: '/student/resources',
      schoolId: request.school_id || undefined,
    });
  } catch (notifyErr) {
    logger.error('Resource declined notify failed', { requestId: input.requestId, error: (notifyErr as Error).message });
  }

  return { ...request, status: 'declined', declined_reason: reason } as ResourceRequestRow;
}

/** The student's pushed resources, grouped by subject then concept. */
export async function getStudentResources(studentId: string) {
  const { data, error } = await supabase()
    .from('student_resources')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const resources = (data || []) as Array<{
    subject_name: string;
    concept_title: string;
    [key: string]: unknown;
  }>;

  const groups: Array<{ subject: string; concepts: Array<{ concept: string; items: any[] }> }> = [];
  const subjectMap = new Map<string, number>();
  for (const r of resources) {
    const subject = r.subject_name || 'General';
    let si = subjectMap.get(subject);
    if (si === undefined) {
      si = groups.push({ subject, concepts: [] }) - 1;
      subjectMap.set(subject, si);
    }
    const concepts = groups[si].concepts;
    const concept = r.concept_title || 'General';
    const existing = concepts.find((c) => c.concept === concept);
    if (existing) {
      existing.items.push(r);
    } else {
      concepts.push({ concept, items: [r] });
    }
  }
  return groups;
}

/** Search candidate resources (Khan Academy / YouTube) for a concept, to help teachers push. */
export async function searchResourcesForConcept(conceptId: string, maxResults = 6): Promise<TeachResource[]> {
  const ctx = await getConceptContext(conceptId);
  const results = await searchTeachResources(ctx.subjectName, ctx.chapterTitle, ctx.conceptTitle, [], maxResults);
  return results;
}
