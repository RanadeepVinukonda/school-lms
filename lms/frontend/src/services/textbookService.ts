import { supabase } from '@/supabase/config';
import { logAudit } from '@/services/auditService';
import api from '@/services/api';
import type { Textbook, Chapter, Concept, GeneratedQuestion, GeneratedAssignment, CachedVideo, ConceptProgress, ConceptRelease } from '@/types/textbook';

const TEXTBOOKS_COLLECTION = 'textbooks';
const CHAPTERS_COLLECTION = 'chapters';
const CONCEPTS_COLLECTION = 'concepts';
const CONCEPT_PROGRESS_COLLECTION = 'conceptProgress';
const CONCEPT_RELEASES_COLLECTION = 'conceptReleases';

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
  const { data: inserted } = await supabase.from(TEXTBOOKS_COLLECTION).insert({
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select('id').single();
  const id = inserted?.id || crypto.randomUUID();
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
  await supabase.from(TEXTBOOKS_COLLECTION).update({
    ...data,
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
    await supabase.from(CHAPTERS_COLLECTION).upsert({
      textbook_id: textbookId,
      ...chapterData,
      id: chapter.id,
      order: chapterData.order ?? 0,
      createdAt: new Date().toISOString(),
    });

    for (const concept of concepts) {
      const { questionBank, ...conceptData } = concept;
      await supabase.from(CONCEPTS_COLLECTION).upsert({
        textbook_id: textbookId,
        chapter_id: chapter.id,
        ...conceptData,
        id: concept.id,
        order: conceptData.order ?? 0,
        createdAt: new Date().toISOString(),
      });

      if (Array.isArray(questionBank)) {
        for (const q of questionBank) {
          await supabase.from('concept_questions').upsert({
            id: q.id,
            concept_id: concept.id,
            textbook_id: textbookId,
            chapter_id: chapter.id,
            question: q.text,
            type: q.type,
            difficulty: q.difficulty,
            answer: q.correctAnswer,
            explanation: q.explanation || '',
            created_at: new Date().toISOString(),
          });
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
  const defaults = {
    userId,
    conceptId,
    quizScores: [],
    quizAttempts: 0,
    timeSpentMinutes: 0,
    lessonCompleted: false,
    videoCompleted: false,
    questionAccuracy: 0,
    assignmentScores: [],
    masteryPercentage: 0,
    skillLevel: 'beginner',
  };
  await supabase.from(CONCEPT_PROGRESS_COLLECTION).upsert({
    id,
    ...defaults,
    ...data,
    lastAccessed: new Date().toISOString(),
  });
}

/** Fetch concept progress for a specific user and concept. Returns null if not found. */
export async function getConceptProgress(userId: string, conceptId: string): Promise<ConceptProgress | null> {
  const { data } = await supabase.from(CONCEPT_PROGRESS_COLLECTION).select('*').eq('id', `${userId}_${conceptId}`).maybeSingle();
  return data as ConceptProgress | null;
}

/** Fetch all concepts progress for a given user. */
export async function getAllConceptProgress(userId: string): Promise<ConceptProgress[]> {
  const { data } = await supabase.from(CONCEPT_PROGRESS_COLLECTION).select('*').eq('userId', userId);
  return (data || []) as ConceptProgress[];
}

/** Fetch all concept releases for a textbook and class. */
export async function getAllConceptReleases(classId: string, textbookId: string): Promise<ConceptRelease[]> {
  const { data } = await supabase.from(CONCEPT_RELEASES_COLLECTION).select('*').eq('classId', classId).eq('textbookId', textbookId);
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
      text: q.question || q.text, // Map backend 'question' to frontend 'text'
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
        embedUrl: `https://www.youtube.com/embed/${v.video_id}`
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
  await supabase.from(CONCEPT_RELEASES_COLLECTION).upsert({
    id,
    classId,
    textbookId,
    chapterId,
    conceptId,
    teacherId,
    questionBankReleased: false,
    assignmentsReleased: false,
    mindMapReleased: false,
    ...data,
    updatedAt: new Date().toISOString(),
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
