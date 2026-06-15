import { Request, Response } from 'express';
import * as codingService from '../services/coding.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReqWithUser } from '../types/common';

export async function getAllProjects(_req: Request, res: Response) {
  const projects = await codingService.getAllProjects();
  sendSuccess(res, projects);
}

export async function getProjectById(req: Request, res: Response) {
  const project = await codingService.getProjectById(req.params.id);
  sendSuccess(res, project);
}

export async function createProject(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  const project = await codingService.createProject({ ...req.body, ownerId: userId });
  sendCreated(res, project, 'Coding project created');
}

export async function updateProject(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  const project = await codingService.updateProject(req.params.id, req.body, userId);
  sendSuccess(res, project, 'Coding project updated');
}

export async function deleteProject(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  await codingService.deleteProject(req.params.id, userId);
  sendSuccess(res, null, 'Coding project deleted');
}

export async function executeCode(req: Request, res: Response) {
  const { code, language } = req.body;
  const result = await codingService.executeCode(code, language);
  sendSuccess(res, result);
}

export async function getAllStreamProjects(_req: Request, res: Response) {
  const projects = await codingService.getAllStreamProjects();
  sendSuccess(res, projects);
}

export async function createStreamProject(req: Request, res: Response) {
  const project = await codingService.createStreamProject(req.body);
  sendCreated(res, project, 'STREAM project created');
}

export async function addStreamCollaborator(req: Request, res: Response) {
  const result = await codingService.addStreamCollaborator(req.params.id, req.body.collaboratorId);
  sendSuccess(res, result, 'Collaborator added');
}
