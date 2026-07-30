import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { addUploadJob } from '../jobs/queue';

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

  // Verify teacher assignment
  if (data.teacherRole !== 'admin') {
    const { data: teacherAssignments, error } = await supabase
      .from('firestore_docs')
      .select('data, doc_id')
      .eq('collection', 'teacherClassSubject')
      .filter('data->>teacherId', 'eq', data.teacherId)
      .filter('data->>classId', 'eq', data.classId)
      .filter('data->>subjectId', 'eq', data.subjectId)
      .limit(1);
    if (error) throw error;
    if (!teacherAssignments?.length) {
      throw new ForbiddenError('You are not assigned to teach this subject in this class');
    }
  }

  const textbookId = uuidv4();
  const now = new Date().toISOString();
  let storagePath = '';
  let pdfUrl = '';
  let status: 'processing' | 'ready' | 'error' = 'ready';

  if (data.cloudinaryUrl && data.cloudinaryPublicId) {
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

  if (insertError) {
    // Fallback: try raw REST API in case of schema cache issue
    try {
      logger.warn('Supabase insert failed, retrying via raw REST API', { error: insertError.message });
      const supabaseUrl = env.SUPABASE_URL;
      const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const res = await fetch(`${supabaseUrl}/rest/v1/textbooks`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
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
          }),
        });
        if (res.ok) {
          logger.info('Textbook inserted via raw REST API fallback', { textbookId });
        } else {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Raw REST insert failed: ${errBody || res.statusText}`);
        }
      } else {
        throw insertError;
      }
    } catch (fallbackErr) {
      throw fallbackErr instanceof Error ? fallbackErr : insertError;
    }
  }

  // Submit to Inngest background processing (fire-and-forget when inline)
  try {
    await addUploadJob(textbookId, storagePath);
    logger.info('Textbook upload job sent to Inngest', { textbookId });
  } catch (err) {
    logger.info('Inngest unavailable — firing inline processing', {
      textbookId,
      err: err instanceof Error ? err.message : String(err),
    });
    try {
      const { processUploadInline } = require('./pipeline.service');
      processUploadInline(textbookId).catch(async (aiErr: unknown) => {
        logger.error('Inline pipeline failed', { textbookId, error: aiErr instanceof Error ? aiErr.message : String(aiErr) });
        await supabase.from('textbooks').update({
          status: 'error', failure_reason: 'AI processing failed. Please try again later.', updated_at: now,
        }).eq('id', textbookId);
      });
    } catch (loadErr) {
      logger.error('Failed to load pipeline.service', { textbookId, error: loadErr });
    }
  }
  status = 'processing';

  logger.info('Textbook created', { textbookId, title: data.title, status });
  return {
    id: textbookId, title: data.title, subjectId: data.subjectId, classId: data.classId,
    teacherId: data.teacherId, description: data.description || '', coverImage: data.coverImage || '',
    storagePath, pdfUrl, status, chapterCount: 0, totalConcepts: 0, completedConcepts: 0,
    createdAt: now, updatedAt: now,
  };
}

export async function reprocessTextbook(textbookId: string, requestingTeacherId: string, requestingTeacherRole?: string) {
  const supabase = getSupabaseAdmin();

  const { data: doc, error } = await supabase.from('textbooks').select('*').eq('id', textbookId).single();
  if (error || !doc) throw new NotFoundError('Textbook not found');

  if (requestingTeacherRole !== 'admin' && doc.teacher_id !== requestingTeacherId) {
    throw new ForbiddenError('You do not own this textbook');
  }
  if (doc.status !== 'failed' && doc.status !== 'ready' && doc.status !== 'processing') {
    throw new ConflictError(`Cannot reprocess textbook with status "${doc.status}". Only "failed", "processing", or "ready" textbooks can be reprocessed.`);
  }
  if (!doc.storage_path) {
    throw new ConflictError('Textbook has no storagePath — cannot reprocess without an uploaded PDF.');
  }

  const { error: updateProcessingError } = await supabase
    .from('textbooks')
    .update({ status: 'processing', failure_reason: null, updated_at: new Date().toISOString() })
    .eq('id', textbookId);
  if (updateProcessingError) throw new Error(`Failed to update textbooks: ${updateProcessingError.message}`);

  try {
    await addUploadJob(textbookId, doc.storage_path);
    logger.info('Textbook reprocessing triggered via Inngest', { textbookId });
    return { textbookId, status: 'processing' };
  } catch {
    logger.info('Inngest unavailable for reprocess — firing inline', { textbookId });
    try {
      const { processUploadInline } = require('./pipeline.service');
      processUploadInline(textbookId).catch(async (aiErr: unknown) => {
        logger.error('Inline reprocessing failed', { textbookId, error: aiErr instanceof Error ? aiErr.message : String(aiErr) });
        await supabase.from('textbooks').update({
          status: 'failed', failure_reason: 'AI reprocessing failed. Please try again later.', updated_at: new Date().toISOString(),
        }).eq('id', textbookId);
      });
    } catch (loadErr) {
      logger.error('Failed to load pipeline.service for reprocess', { textbookId, error: loadErr });
    }
    return { textbookId, status: 'processing' };
  }
}

export async function getTextbooksByClassAndSubject(classId: string, subjectId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('textbooks').select('*').eq('class_id', classId).eq('subject_id', subjectId);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch textbooks: ' + error.message);
  return data || [];
}

export async function listAllTextbooks(schoolId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('textbooks').select('*');
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch textbooks: ' + error.message);
  return data || [];
}

export async function getTextbookById(textbookId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('textbooks').select('*').eq('id', textbookId).single();
  if (error || !data) throw new NotFoundError('Textbook not found');

  if (user && user.role === 'student') {
    if (!(user.classIds as string[])?.includes(data.class_id)) {
      throw new ForbiddenError('You do not have access to this textbook');
    }
  }
  return data;
}

export async function getChapters(textbookId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  await getTextbookById(textbookId, user);
  const { data, error } = await supabase.from('chapters').select('*').eq('textbook_id', textbookId).order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getConcepts(textbookId: string, chapterId: string, user?: Express.Request['user']) {
  const supabase = getSupabaseAdmin();
  await getTextbookById(textbookId, user);
  const { data, error } = await supabase.from('concepts').select('*').eq('chapter_id', chapterId).eq('textbook_id', textbookId).order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteTextbook(textbookId: string) {
  const supabase = getSupabaseAdmin();

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
    const tables = ['concept_questions', 'concept_resources', 'concept_videos', 'concept_notes', 'raw_pages', 'processing_jobs', 'concepts', 'chapters', 'textbooks'];
    for (const table of tables) {
      const { error: delErr } = await supabase.from(table as any).delete().eq('textbook_id', textbookId);
      if (delErr) throw new Error(`Failed to delete ${table}: ${delErr.message}`);
    }
  }

  logger.info('Textbook deleted', { textbookId });
}
