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
      .select('id, title, summary, keywords, chapter_id, textbook_id')
      .eq('id', conceptId)
      .single();

    if (error || !concept) {
      return sendError(res, 'Concept not found', 404);
    }

    let chapterTitle = '';
    let subjectName = '';

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
          .select('name')
          .eq('id', textbook.subject_id)
          .single();
        if (subject) subjectName = subject.name;
      }
    }

    const keywords: string[] = [];
    if (typeof concept.keywords === 'string') {
      try { keywords.push(...JSON.parse(concept.keywords)); } catch { keywords.push(concept.keywords); }
    } else if (Array.isArray(concept.keywords)) {
      keywords.push(...concept.keywords);
    }
    if (concept.summary) keywords.push(concept.summary.slice(0, 100));

    const resources = await teachResourcesService.searchTeachResources(
      subjectName,
      chapterTitle,
      concept.title,
      keywords,
    );

    return sendSuccess(res, resources);
  } catch (err) {
    logger.error('Failed to search teach resources', { error: (err as Error).message });
    return sendError(res, 'Failed to search resources', 500);
  }
}
