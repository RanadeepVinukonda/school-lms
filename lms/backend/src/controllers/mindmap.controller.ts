import { Request, Response } from 'express';
import * as mindmapService from '../services/mindmap.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function generateMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { text, title, language } = req.body;
  const mindMap = await mindmapService.generateMindMapFromText(req.user.uid, text, title, language);
  sendCreated(res, mindMap, 'Mind map generated');
}

export async function createMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { title, description } = req.body;
  const mindMap = await mindmapService.createMindMap(req.user.uid, title, description);
  sendCreated(res, mindMap, 'Mind map created');
}

export async function getMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const mindMap = await mindmapService.getMindMapById(req.params.id, req.user.uid);
  sendSuccess(res, mindMap);
}

export async function updateMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { title, description, nodes, edges } = req.body;
  const mindMap = await mindmapService.updateMindMap(req.params.id, req.user.uid, {
    title, description, nodes, edges,
  });
  sendSuccess(res, mindMap, 'Mind map updated');
}

export async function deleteMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await mindmapService.deleteMindMap(req.params.id, req.user.uid);
  sendNoContent(res);
}

export async function removeSharedMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await mindmapService.removeSharedMindMap(req.params.id, req.user.uid);
  sendNoContent(res);
}

export async function getUserMindMaps(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const mindMaps = await mindmapService.getUserMindMaps(req.user.uid);
  sendSuccess(res, mindMaps);
}

export async function getSharedMindMaps(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const mindMaps = await mindmapService.getSharedMindMaps(req.user.uid);
  sendSuccess(res, mindMaps);
}

export async function shareMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { shareWithIds } = req.body;
  const mindMap = await mindmapService.shareMindMap(req.params.id, req.user.uid, shareWithIds);
  sendSuccess(res, mindMap, 'Mind map shared');
}

export async function generateTextbookMindMap(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { textbookId, language } = req.body;
  const mindMap = await mindmapService.generateTextbookMindMap(req.user.uid, textbookId, language);
  sendCreated(res, mindMap, 'Textbook mind map generated');
}

export async function pushMindMapToClasses(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { classIds } = req.body;
  const mindMap = await mindmapService.pushToClasses(req.params.id, req.user.uid, classIds);
  sendSuccess(res, mindMap, 'Mind map pushed to classes');
}

export async function pinResource(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { nodeId, resourceId, resourceType } = req.body;
  const mindMap = await mindmapService.pinResource(
    req.params.id, req.user.uid, nodeId, resourceId, resourceType,
  );
  sendSuccess(res, mindMap, 'Resource pinned');
}
