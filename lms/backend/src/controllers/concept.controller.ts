import { Request, Response } from 'express';
import { getCollection } from '../database/adapter';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

/** Fetch whiteboard strokes for a concept, scoped to the requesting teacher. */
export async function getWhiteboard(req: Request, res: Response) {
  const { conceptId } = req.params;
  const teacherId = req.user!.uid;

  const snap = await getCollection('whiteboards')
    .doc(`${teacherId}_${conceptId}`)
    .get();

  if (!snap.exists) {
    sendSuccess(res, { strokes: [] });
    return;
  }

  sendSuccess(res, { id: snap.id, ...snap.data() });
}

/** Save (overwrite) whiteboard strokes for a concept, scoped to the requesting teacher. */
export async function saveWhiteboard(req: Request, res: Response) {
  const { conceptId } = req.params;
  const teacherId = req.user!.uid;
  const { strokes } = req.body;

  if (!Array.isArray(strokes)) {
    sendSuccess(res, { message: 'No strokes provided, nothing saved' });
    return;
  }

  await getCollection('whiteboards')
    .doc(`${teacherId}_${conceptId}`)
    .set({
      strokes,
      teacherId,
      conceptId,
      updatedAt: new Date().toISOString(),
    });

  logger.info('Whiteboard saved', { conceptId, teacherId, strokeCount: strokes.length });
  sendSuccess(res, { strokes, saved: true }, 'Whiteboard saved');
}
