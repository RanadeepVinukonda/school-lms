import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';
import * as teachResourcesService from '../services/teach-resources.service';

export async function searchTeachResources(req: Request, res: Response) {
  try {
    const { conceptId } = req.params;
    if (!conceptId) {
      return sendError(res, 'Concept ID is required', 400);
    }

    const supabase = getSupabaseAdmin()!;
    const { data: concept, error } = await supabase
      .from('concepts')
      .select('id, title, chapter_id, textbook_id')
      .eq('id', conceptId)
      .single();

    if (error || !concept) {
      return sendError(res, 'Concept not found', 404);
    }

    const { data: notes } = await supabase
      .from('concept_notes')
      .select('summary, keywords')
      .eq('concept_id', conceptId)
      .maybeSingle();

    let chapterTitle = '';
    let subjectName = '';
    let gradeLevel: string | undefined;

    const { data: chapter } = await supabase
      .from('chapters')
      .select('title, textbook_id')
      .eq('id', concept.chapter_id)
      .single();

    if (chapter) {
      chapterTitle = chapter.title || '';

      const { data: textbook } = await supabase
        .from('textbooks')
        .select('title, subject_id')
        .eq('id', concept.textbook_id || chapter.textbook_id)
        .single();

      if (textbook?.subject_id) {
        const { data: subject } = await supabase
          .from('subjects')
          .select('name, "classId"')
          .eq('id', textbook.subject_id)
          .single();
        if (subject) subjectName = subject.name;
        if (subject?.classId) {
          const { data: cls } = await supabase
            .from('classes')
            .select('name, grade')
            .eq('id', subject.classId)
            .single();
          if (cls) gradeLevel = (cls.grade as string) || (cls.name as string) || undefined;
        }
      }
    }

    const keywords: string[] = [];
    if (notes?.keywords) {
      if (typeof notes.keywords === 'string') {
        try { keywords.push(...JSON.parse(notes.keywords)); } catch { keywords.push(notes.keywords); }
      } else if (Array.isArray(notes.keywords)) {
        keywords.push(...notes.keywords);
      }
    }
    if (notes?.summary) keywords.push(notes.summary.slice(0, 100));

    const resources = await teachResourcesService.searchTeachResources(
      subjectName,
      chapterTitle,
      concept.title,
      keywords,
      undefined,
      gradeLevel,
    );

    // Persist found resources to concept_videos so they appear on reload.
    // Merge instead of blind insert: refresh metadata for videos that already
    // exist, insert brand-new ones, and keep any videos already persisted for
    // this concept that the latest search did not return.
    if (resources.length > 0) {
      const { v4: uuidv4 } = await import('uuid');
      const { data: existingRows } = await supabase
        .from('concept_videos')
        .select('id, video_id')
        .eq('concept_id', concept.id);

      const existingById = new Map<string, string>();
      for (const row of existingRows || []) existingById.set(row.video_id, row.id);

      const toInsert: any[] = [];
      for (const r of resources) {
        const videoKey = r.videoId || r.id;
        const payload = {
          title: r.title,
          description: r.description || '',
          channel: r.channelName || r.sourceLabel,
          thumbnail: r.thumbnail || '',
          duration: r.duration || '',
          score: r.relevance || 0.5,
          data: { source: r.source, sourceLabel: r.sourceLabel, url: r.url, embedUrl: r.embedUrl },
        };

        const existingId = existingById.get(videoKey);
        if (existingId) {
          const { error: updateError } = await supabase
            .from('concept_videos')
            .update(payload)
            .eq('id', existingId);
          if (updateError) logger.warn('Failed to update persisted teach resource', { videoKey, error: updateError });
        } else {
          toInsert.push({ ...payload, id: uuidv4(), concept_id: concept.id, textbook_id: concept.textbook_id, chapter_id: concept.chapter_id, video_id: videoKey });
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('concept_videos').insert(toInsert);
        if (insertError) logger.warn('Failed to persist teach resources', { error: insertError });
      }
    }

    return sendSuccess(res, resources);
  } catch (err) {
    logger.error('Failed to search teach resources', { error: (err as Error).message });
    return sendError(res, 'Failed to search resources', 500);
  }
}
