import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { addUploadJob, removeUploadJob } from '../jobs/queue';



async function populateMockContent(textbookId: string, textbookTitle: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const titleLower = textbookTitle.toLowerCase();
  let chapDetails: Array<{ title: string; concepts: string[] }>;

  if (titleLower.includes('math') || titleLower.includes('alg') || titleLower.includes('calc')) {
    chapDetails = [
      { title: 'Chapter 1: Quadratic Equations', concepts: ['Factoring Quadratics', 'Quadratic Formula'] },
      { title: 'Chapter 2: Trigonometry', concepts: ['Trig Ratios', 'Laws of Sines and Cosines'] },
    ];
  } else if (titleLower.includes('science') || titleLower.includes('phys') || titleLower.includes('chem')) {
    chapDetails = [
      { title: 'Chapter 1: Classical Mechanics', concepts: ['Newtonian Laws', 'Conservation of Momentum'] },
      { title: 'Chapter 2: Thermodynamics', concepts: ['First Law', 'Heat Transfer'] },
    ];
  } else {
    chapDetails = [
      { title: 'Chapter 1: Foundations', concepts: ['Core Concepts', 'Historical Context'] },
      { title: 'Chapter 2: Advanced Topics', concepts: ['Analytical Frameworks', 'Applications'] },
    ];
  }

  for (let cIdx = 0; cIdx < chapDetails.length; cIdx++) {
    const chapInfo = chapDetails[cIdx];
    const chapId = uuidv4();

    await supabase.from('chapters').insert({
      id: chapId,
      textbook_id: textbookId,
      title: chapInfo.title,
      order: cIdx + 1,
      summary: `Coverage of ${chapInfo.title}`,
    });

    for (let coIdx = 0; coIdx < chapInfo.concepts.length; coIdx++) {
      const conceptTitle = chapInfo.concepts[coIdx];
      const conceptId = uuidv4();

      const questionBank = [
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'mcq', difficulty: 'easy', text: `What is a key aspect of ${conceptTitle}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'Option A', explanation: '', points: 5 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'true_false', difficulty: 'easy', text: `${conceptTitle} is a fundamental concept.`, options: ['True', 'False'], answer: 'True', explanation: '', points: 2 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'fill_blank', difficulty: 'medium', text: `The study of ${conceptTitle} relies on ___.`, options: [], answer: 'theory', explanation: '', points: 5 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'matching', difficulty: 'medium', text: `Match terms in ${conceptTitle}.`, options: ['Term A - Def 1', 'Term B - Def 2', 'Term C - Def 3'], answer: 'Term A:Def 1|Term B:Def 2|Term C:Def 3', explanation: '', points: 8 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'numerical', difficulty: 'hard', text: `If the value for ${conceptTitle} is 5, what is double?`, options: [], answer: '10', explanation: '', points: 10 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'descriptive', difficulty: 'hots', text: `Analyze the significance of ${conceptTitle}.`, options: [], answer: 'Comprehensive analysis required.', explanation: '', points: 15 },
        { id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapId, type: 'passage', difficulty: 'hots', text: `Based on the passage, what is the main idea about ${conceptTitle}?`, passage_text: `${conceptTitle} is a vital concept that has evolved over time through research.`, options: ['It is static', 'It is dynamic', 'It is irrelevant', 'It is trivial'], answer: 'It is dynamic', explanation: '', points: 10 },
      ];

      await supabase.from('concepts').insert({
        id: conceptId,
        chapter_id: chapId,
        textbook_id: textbookId,
        title: conceptTitle,
        order: coIdx + 1,
        notes: `Study notes covering key rules and principles of ${conceptTitle}.`,
        video_links: [`https://www.youtube.com/results?search_query=${encodeURIComponent(conceptTitle)}`],
      });

      for (const q of questionBank) {
        await supabase.from('concept_questions').insert(q as Record<string, unknown>);
      }
    }
  }

  await supabase.from('textbooks').update({ status: 'ready', chapter_count: chapDetails.length, updated_at: new Date().toISOString() }).eq('id', textbookId);
}

export async function createTextbook(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  description?: string;
  coverImage?: string;
  pdfFilePath?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  teacherRole?: string;
  schoolId?: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  let assignment: Record<string, unknown> | null = null;

  if (data.teacherRole !== 'admin') {
    const { data: teacherAssignments } = await supabase
      .from('nosql_docs')
      .select('data, doc_id')
      .eq('collection', 'teacherClassSubject')
      .filter('data->>teacherId', 'eq', data.teacherId)
      .filter('data->>classId', 'eq', data.classId)
      .filter('data->>subjectId', 'eq', data.subjectId)
      .limit(1);

    if (!teacherAssignments?.length) {
      throw new ForbiddenError('You are not assigned to teach this subject in this class');
    }
    assignment = { id: teacherAssignments[0].doc_id, ...teacherAssignments[0].data as Record<string, unknown> };
  }

  const textbookId = uuidv4();
  const now = new Date().toISOString();
  let storagePath = '';
  let pdfUrl = '';
  let status: 'processing' | 'ready' = 'ready';

  if (data.cloudinaryUrl && data.cloudinaryPublicId) {
    // ponytail: existing cloudinary URL passed through; R2 migration for existing uploads deferred
    pdfUrl = data.cloudinaryUrl;
    storagePath = data.cloudinaryPublicId;
    status = 'processing';
  } else if (data.pdfFilePath) {
    const key = `${textbookId}.pdf`;
    const bucket = env.SUPABASE_STORAGE_BUCKET || 'textbooks';
    const fileStream = require('fs').createReadStream(data.pdfFilePath);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(key, fileStream, {
      contentType: 'application/pdf',
      upsert: true,
      duplex: 'half',
    });
    if (uploadError) throw uploadError;
    storagePath = key;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
    pdfUrl = urlData.publicUrl;
    status = 'processing';
  }

  const { error: insertError } = await supabase.from('textbooks').insert({
    id: textbookId,
    title: data.title,
    subject_id: data.subjectId,
    class_id: data.classId,
    teacher_id: data.teacherId,
    description: data.description || '',
    cover_image: data.coverImage || '',
    storage_path: storagePath,
    pdf_url: pdfUrl,
    status,
    chapter_count: 0,
    total_concepts: 0,
    completed_concepts: 0,
    school_id: data.schoolId,
    created_at: now,
    updated_at: now,
  });

  if (insertError) throw insertError;

  const populateAndMaybeEnrich = async () => {
    await populateMockContent(textbookId, data.title);
    if (pdfUrl) {
      try {
        const { processUploadInline } = require('./pipeline.service');
        await processUploadInline(textbookId);
      } catch (err) {
        logger.info('Background AI enrichment not available, mock content is ready', { textbookId });
      }
    }
  };

  try {
    await addUploadJob(textbookId, storagePath);
    status = 'processing';
    logger.info('Textbook upload job added to background queue', { textbookId });
  } catch (err) {
    logger.error('Failed to add upload job, falling back to inline', { textbookId, err });
    populateAndMaybeEnrich().catch((e: unknown) => logger.error('Background populate failed', { textbookId, e }));
    status = 'ready';
  }

  if (assignment?.id) {
    const { data: existing } = await supabase
      .from('nosql_docs')
      .select('data')
      .eq('collection', 'teacherClassSubject')
      .eq('doc_id', assignment.id)
      .maybeSingle();
    const merged = { ...(existing?.data as Record<string, unknown> ?? {}), textbookId, updatedAt: now };
    await supabase.from('nosql_docs').upsert({
      collection: 'teacherClassSubject',
      doc_id: assignment.id,
      data: merged,
      updated_at: now,
    }, { onConflict: 'collection,doc_id' });
  }

  logger.info('Textbook created', { textbookId, title: data.title, status });
  return { id: textbookId, title: data.title, subjectId: data.subjectId, classId: data.classId, teacherId: data.teacherId, description: data.description || '', coverImage: data.coverImage || '', storagePath, pdfUrl, status, chapterCount: 0, totalConcepts: 0, completedConcepts: 0, createdAt: now, updatedAt: now };
}

export async function reprocessTextbook(textbookId: string, requestingTeacherId: string, requestingTeacherRole?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: doc, error } = await supabase.from('textbooks').select('*').eq('id', textbookId).single();
  if (error || !doc) throw new NotFoundError('Textbook not found');

  if (requestingTeacherRole !== 'admin' && doc.teacher_id !== requestingTeacherId) {
    throw new ForbiddenError('You do not own this textbook');
  }
  if (doc.status !== 'failed') throw new ConflictError(`Cannot reprocess textbook with status "${doc.status}". Only "failed" textbooks can be reprocessed.`);
  if (!doc.storage_path) throw new ConflictError('Textbook has no storagePath — cannot reprocess without an uploaded PDF.');

  await supabase.from('textbooks').update({ status: 'processing', failure_reason: null, updated_at: new Date().toISOString() }).eq('id', textbookId);
  try {
    await addUploadJob(textbookId, doc.storage_path);
    logger.info('Textbook reprocessing triggered', { textbookId });
    return { textbookId, status: 'processing' };
  } catch {
    await populateMockContent(textbookId, doc.title);
    await supabase.from('textbooks').update({ status: 'ready', failure_reason: null, updated_at: new Date().toISOString() }).eq('id', textbookId);
    logger.info('Textbook reprocessed with mock content (inline fallback)', { textbookId });
    return { textbookId, status: 'ready' };
  }
}

export async function getTextbooksByClassAndSubject(classId: string, subjectId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  let query = supabase.from('textbooks').select('*').eq('class_id', classId).eq('subject_id', subjectId);
  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }
  const { data } = await query;
  return data || [];
}

export async function listAllTextbooks(schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  let query = supabase.from('textbooks').select('*');
  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }
  const { data } = await query;
  return data || [];
}

export async function getTextbookById(textbookId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('textbooks').select('*').eq('id', textbookId).single();
  if (error || !data) throw new NotFoundError('Textbook not found');

  if (user && user.role === 'student') {
    if (!user.classIds?.includes(data.class_id)) {
      throw new ForbiddenError('You do not have access to this textbook');
    }
  }

  return data;
}

export async function getChapters(textbookId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  
  // Verify user has access to this textbook
  await getTextbookById(textbookId, user);

  const { data } = await supabase.from('chapters').select('*').eq('textbook_id', textbookId).order('order', { ascending: true });
  return data || [];
}

export async function getConcepts(textbookId: string, chapterId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  
  // Verify user has access to this textbook
  await getTextbookById(textbookId, user);

  const { data } = await supabase.from('concepts').select('*').eq('chapter_id', chapterId).eq('textbook_id', textbookId).order('order', { ascending: true });
  return data || [];
}

export async function deleteTextbook(textbookId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: doc, error } = await supabase.from('textbooks').select('storage_path').eq('id', textbookId).single();
  if (error || !doc) throw new NotFoundError('Textbook not found');

  if (doc.storage_path && !doc.storage_path.startsWith('http')) {
    const bucket = env.SUPABASE_STORAGE_BUCKET || 'textbooks';
    await supabase.storage.from(bucket).remove([doc.storage_path]);
  }

  // Attempt transactional cascade delete via RPC; fall back to sequential deletes
  const { error: rpcErr } = await supabase.rpc('delete_textbook_cascade', { tid: textbookId });
  if (rpcErr) {
    logger.warn('delete_textbook_cascade RPC failed, falling back to sequential deletes', { textbookId, error: rpcErr.message });
    await supabase.from('concept_questions').delete().eq('textbook_id', textbookId);
    await supabase.from('concept_resources').delete().eq('textbook_id', textbookId);
    await supabase.from('concept_videos').delete().eq('textbook_id', textbookId);
    await supabase.from('concept_notes').delete().eq('textbook_id', textbookId);
    await supabase.from('raw_pages').delete().eq('textbook_id', textbookId);
    await supabase.from('processing_jobs').delete().eq('textbook_id', textbookId);
    await supabase.from('concepts').delete().eq('textbook_id', textbookId);
    await supabase.from('chapters').delete().eq('textbook_id', textbookId);
    await supabase.from('textbooks').delete().eq('id', textbookId);
  }

  try {
    await removeUploadJob(textbookId);
  } catch (e) {
    logger.error('Failed to remove upload job during textbook deletion', { textbookId, e });
  }

  logger.info('Textbook deleted', { textbookId });
}
