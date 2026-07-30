import { supabase } from '@/supabase/config';
import { logAudit } from '@/services/auditService';
import api from '@/services/api';
import type { Textbook, Chapter, Concept, GeneratedQuestion, GeneratedAssignment, CachedVideo, ConceptProgress, ConceptRelease } from '@/types/textbook';

const TEXTBOOKS_COLLECTION = 'textbooks';
const CHAPTERS_COLLECTION = 'chapters';
const CONCEPTS_COLLECTION = 'concepts';
const CONCEPT_PROGRESS_COLLECTION = 'concept_progress';
const CONCEPT_RELEASES_COLLECTION = 'concept_releases';

const snakeToCamel = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  return Object.keys(obj).reduce((acc, key) => {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    acc[camel] = obj[key];
    return acc;
  }, {} as any);
};

/** Create a new textbook document in Supabase. Returns the new document id. */
export async function createTextbook(data: Omit<Textbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase credentials not configured');

  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token;
  if (!token) throw new Error('No authenticated session');

  const res = await fetch(`${supabaseUrl}/rest/v1/textbooks`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      title: data.title,
      subject_id: data.subjectId,
      class_id: data.classId,
      status: data.status || 'processing',
      processing_progress: data.processingProgress ?? 0,
      processing_stage: data.processingStage ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Failed to create textbook: ${errBody || res.statusText}`);
  }

  const inserted = await res.json();
  const id = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!id) throw new Error('Textbook created but no ID returned');

  logAudit({
    action: 'textbook.create',
    targetId: id,
    targetType: 'textbook',
    targetName: data.title || 'Untitled',
    summary: `Created textbook "${data.title || 'Untitled'}" for subject ${data.subjectId}`,
    newValue: { ...data },
  });
  return id;
}

/** Update a textbook document's fields. */
export async function updateTextbook(id: string, data: Partial<Textbook>): Promise<void> {
  const { chapters, ...rest } = data;
  await supabase.from(TEXTBOOKS_COLLECTION).update({
    ...rest,
    updatedAt: new Date().toISOString(),
  }).eq('id', id);
  logAudit({
    action: 'textbook.update',
    targetId: id,
    targetType: 'textbook',
    targetName: data.title || id,
    summary: `Updated textbook "${data.title || id}"`,
    newValue: data,
  });
}

/** Fetch a single textbook by id. Returns null if not found. */
export async function getTextbook(id: string): Promise<Textbook | null> {
  const { data } = await supabase.from(TEXTBOOKS_COLLECTION).select('*').eq('id', id).maybeSingle();
  return snakeToCamel(data) as Textbook | null;
}

/** Fetch all textbooks from Supabase. */
export async function getAllTextbooks(): Promise<Textbook[]> {
  const { data } = await supabase.from(TEXTBOOKS_COLLECTION).select('*');
  return (snakeToCamel(data || []) as Textbook[]);
}

/** Fetch textbooks belonging to a specific subject. */
export async function getTextbooksBySubject(subjectId: string): Promise<Textbook[]> {
  const { data } = await supabase.from(TEXTBOOKS_COLLECTION).select('*').eq('subject_id', subjectId);
  return (snakeToCamel(data || []) as Textbook[]);
}

/** Delete a textbook via backend API. */
export async function deleteTextbook(id: string): Promise<void> {
  await api.delete(`/textbooks/${id}`);
}

/** Save chapter data to a textbook: creates records for each chapter and concept in flat tables. */
export async function saveChapters(textbookId: string, chapters: Chapter[]): Promise<void> {
  const { data: textbook } = await supabase.from(TEXTBOOKS_COLLECTION).select('id').eq('id', textbookId).maybeSingle();
  if (!textbook) return;

  for (const chapter of chapters) {
    const { concepts, ...chapterData } = chapter;
    const { error: chErr } = await supabase.from(CHAPTERS_COLLECTION).upsert({
      textbook_id: textbookId,
      ...chapterData,
      id: chapter.id,
      order: chapterData.order ?? 0,
      createdAt: new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: false });
    if (chErr) throw new Error(`Failed to save chapter "${chapter.title}": ${chErr.message}`);

    for (const concept of concepts) {
      const { questionBank, ...conceptData } = concept;
      const { error: coErr } = await supabase.from(CONCEPTS_COLLECTION).upsert({
        textbook_id: textbookId,
        chapter_id: chapter.id,
        ...conceptData,
        id: concept.id,
        order: conceptData.order ?? 0,
        createdAt: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false });
      if (coErr) throw new Error(`Failed to save concept "${concept.title}": ${coErr.message}`);

      if (Array.isArray(questionBank)) {
        for (const q of questionBank) {
          const { error: qErr } = await supabase.from('concept_questions').upsert({
            id: q.id,
            concept_id: concept.id,
            textbook_id: textbookId,
            chapter_id: chapter.id,
            question: q.text,
            type: q.type,
            difficulty: q.difficulty,
            answer: q.correctAnswer,
            explanation: q.explanation || '',
            points: q.points || 2,
            bloom_level: q.bloomLevel || null,
            hots: q.hots === true || false,
            topic: q.topic || null,
            source: q.source || 'AI Textbook Upload',
            created_at: new Date().toISOString(),
          }, { onConflict: 'id', ignoreDuplicates: false });
          if (qErr) throw new Error(`Failed to save question: ${qErr.message}`);
        }
      }
    }
  }

  await supabase.from(TEXTBOOKS_COLLECTION).update({
    chapter_count: chapters.length,
    status: 'ready',
    processing_progress: 100,
    processing_stage: 'Complete',
    updatedAt: new Date().toISOString(),
  }).eq('id', textbookId);

  logAudit({
    action: 'textbook.chapters.save',
    targetId: textbookId,
    targetType: 'textbook',
    targetName: textbookId,
    summary: `Saved ${chapters.length} chapters to textbook ${textbookId} and marked as ready`,
    newValue: { chapterCount: chapters.length, status: 'ready' },
  });
}

/** Save or update concept progress for a user. Creates a new document with defaults if none exists. */
export async function saveConceptProgress(userId: string, conceptId: string, data: Partial<ConceptProgress>): Promise<void> {
  const id = `${userId}_${conceptId}`;
  const mapped: Record<string, unknown> = {};
  if (data.quizScores !== undefined) mapped.quiz_scores = data.quizScores;
  if (data.quizAttempts !== undefined) mapped.quiz_attempts = data.quizAttempts;
  if (data.timeSpentMinutes !== undefined) mapped.time_spent_minutes = data.timeSpentMinutes;
  if (data.lessonCompleted !== undefined) mapped.lesson_completed = data.lessonCompleted;
  if (data.videoCompleted !== undefined) mapped.video_completed = data.videoCompleted;
  if (data.questionAccuracy !== undefined) mapped.question_accuracy = data.questionAccuracy;
  if (data.assignmentScores !== undefined) mapped.assignment_scores = data.assignmentScores;
  if (data.masteryPercentage !== undefined) mapped.mastery_percentage = data.masteryPercentage;
  if (data.skillLevel !== undefined) mapped.skill_level = data.skillLevel;
  await supabase.from(CONCEPT_PROGRESS_COLLECTION).upsert({
    id,
    user_id: userId,
    concept_id: conceptId,
    quiz_scores: [],
    quiz_attempts: 0,
    time_spent_minutes: 0,
    lesson_completed: false,
    video_completed: false,
    question_accuracy: 0,
    assignment_scores: [],
    mastery_percentage: 0,
    skill_level: 'beginner',
    ...mapped,
    last_accessed: new Date().toISOString(),
  });
}

/** Fetch concept progress for a specific user and concept. Returns null if not found. */
export async function getConceptProgress(userId: string, conceptId: string): Promise<ConceptProgress | null> {
  const { data } = await supabase.from(CONCEPT_PROGRESS_COLLECTION).select('*').eq('id', `${userId}_${conceptId}`).maybeSingle();
  return data as ConceptProgress | null;
}

/** Fetch all concepts progress for a given user. */
export async function getAllConceptProgress(userId: string): Promise<ConceptProgress[]> {
  const { data } = await supabase.from(CONCEPT_PROGRESS_COLLECTION).select('*').eq('user_id', userId);
  return (data || []) as ConceptProgress[];
}

/** Fetch all concept releases for a textbook and class. */
export async function getAllConceptReleases(classId: string, textbookId: string): Promise<ConceptRelease[]> {
  const { data } = await supabase.from(CONCEPT_RELEASES_COLLECTION).select('*').eq('class_id', classId).eq('textbook_id', textbookId);
  return (data || []) as ConceptRelease[];
}

/** Fetch the release status for a concept. Returns default (all false) if not found. */
export async function getConceptRelease(classId: string, textbookId: string, conceptId: string): Promise<ConceptRelease | null> {
  const { data } = await supabase.from(CONCEPT_RELEASES_COLLECTION).select('*').eq('id', `${classId}_${textbookId}_${conceptId}`).maybeSingle();
  return data as ConceptRelease | null;
}

/** Fetch all chapters in a textbook, ordered by chapter order. */
export async function getChaptersForTextbook(textbookId: string): Promise<Chapter[]> {
  const { data } = await supabase.from(CHAPTERS_COLLECTION).select('*').eq('textbook_id', textbookId).order('order');
  return (data || []) as Chapter[];
}

/** Fetch all concepts in a chapter, ordered by concept order. */
export async function getConceptsForChapter(textbookId: string, chapterId: string): Promise<Concept[]> {
  const { data: concepts } = await supabase.from(CONCEPTS_COLLECTION).select('*').eq('chapter_id', chapterId).order('order');
  const result = (concepts || []) as Concept[];

  for (const concept of result) {
    const [questionsRes, notesRes, videosRes] = await Promise.all([
      supabase.from('concept_questions').select('*').eq('concept_id', concept.id),
      supabase.from('concept_notes').select('*').eq('concept_id', concept.id).maybeSingle(),
      supabase.from('concept_videos').select('*').eq('concept_id', concept.id).order('score', { ascending: false }),
    ]);
    
    concept.questionBank = (questionsRes.data || []).map((q: any) => ({
      ...q,
      text: q.question || q.text,
      bloomLevel: q.bloom_level || q.data?.bloomLevel || null,
      hots: q.hots === true || q.hots === 'true' || q.data?.hots === true || false,
      topic: q.topic || q.data?.topic || null,
      source: q.source || q.data?.source || 'AI Textbook Upload',
    })) as GeneratedQuestion[];
    
    if (notesRes.data) {
      concept.notes = notesRes.data.notes || '';
      concept.summary = notesRes.data.summary || '';
      concept.learningObjectives = (notesRes.data.learning_objectives || '').split('\n').filter(Boolean).map(s => s.trim()).filter(Boolean);
      concept.keyPoints = notesRes.data.key_points || '';
      concept.formulas = notesRes.data.formulas || '';
      concept.examples = notesRes.data.examples || '';
    }
    
    if (videosRes.data) {
      concept.videos = videosRes.data.map((v: any) => ({
        id: v.id,
        youtubeId: v.video_id,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration,
        channelName: v.channel,
        description: v.description,
        embedUrl: `https://www.youtube.com/embed/${v.video_id}`,
        relevance: v.relevance ?? 0
      }));
    } else {
      concept.videos = [];
    }
  }
  return result;
}

/** Set or update concept release status (which content is pushed to students). */
export async function setConceptRelease(
  classId: string,
  textbookId: string,
  conceptId: string,
  chapterId: string,
  teacherId: string,
  data: Partial<Pick<ConceptRelease, 'questionBankReleased' | 'assignmentsReleased' | 'mindMapReleased'>>,
): Promise<void> {
  const id = `${classId}_${textbookId}_${conceptId}`;
  const mapped: Record<string, unknown> = {};
  if (data.questionBankReleased !== undefined) mapped.question_bank_released = data.questionBankReleased;
  if (data.assignmentsReleased !== undefined) mapped.assignments_released = data.assignmentsReleased;
  if (data.mindMapReleased !== undefined) mapped.mind_map_released = data.mindMapReleased;
  await supabase.from(CONCEPT_RELEASES_COLLECTION).upsert({
    id,
    class_id: classId,
    textbook_id: textbookId,
    chapter_id: chapterId,
    concept_id: conceptId,
    teacher_id: teacherId,
    question_bank_released: false,
    assignments_released: false,
    mind_map_released: false,
    ...mapped,
    updated_at: new Date().toISOString(),
  });
  logAudit({
    action: 'concept.release',
    targetId: id,
    targetType: 'conceptRelease',
    targetName: `Concept ${conceptId}`,
    summary: `Updated release settings for concept ${conceptId} in textbook ${textbookId} for class ${classId}`,
    newValue: data,
  });
}

/** Reprocess a failed textbook via API. */
export async function reprocessTextbook(textbookId: string): Promise<any> {
  const res = await api.post(`/textbooks/${textbookId}/reprocess`);
  return res.data;
}
