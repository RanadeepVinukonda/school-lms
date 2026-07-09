import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabase';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

/** Fetch whiteboard strokes for a concept, scoped to the requesting teacher. */
export async function getWhiteboard(req: Request, res: Response) {
  const supabase = getSupabaseClient();
  const { conceptId } = req.params;
  const teacherId = req.user!.uid;
  const docId = `${teacherId}_${conceptId}`;

  const { data } = await supabase.from('firestore_docs').select('data').eq('collection', 'whiteboards').eq('doc_id', docId).maybeSingle();

  if (!data) {
    sendSuccess(res, { strokes: [] });
    return;
  }

  sendSuccess(res, { id: docId, ...(data.data as object) });
}

/** Save (overwrite) whiteboard strokes for a concept, scoped to the requesting teacher. */
export async function saveWhiteboard(req: Request, res: Response) {
  const supabase = getSupabaseClient();
  const { conceptId } = req.params;
  const teacherId = req.user!.uid;
  const { strokes } = req.body;

  if (!Array.isArray(strokes)) {
    sendSuccess(res, { message: 'No strokes provided, nothing saved' });
    return;
  }
  const docId = `${teacherId}_${conceptId}`;

  await supabase.from('firestore_docs').upsert({
    collection: 'whiteboards',
    doc_id: docId,
    data: { strokes, teacherId, conceptId, updatedAt: new Date().toISOString() },
  }, { onConflict: 'collection,doc_id' });

  logger.info('Whiteboard saved', { conceptId, teacherId, strokeCount: strokes.length });
  sendSuccess(res, { strokes, saved: true }, 'Whiteboard saved');
}
