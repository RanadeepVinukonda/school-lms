import { Request, Response } from 'express';
import * as schoolService from '../services/school.service';
import { ForbiddenError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export async function createSchool(req: Request, res: Response) {
  const { name, subdomain, logo_url, primary_color, plan } = req.body;
  const result = await schoolService.createSchool({ name, subdomain, logo_url, primary_color, plan });
  sendSuccess(res, result, undefined, 201);
}

export async function getSchool(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  if (req.params.id !== req.user.school_id) throw new ForbiddenError('Access denied');
  const data = await schoolService.getSchool(req.params.id);
  sendSuccess(res, data);
}

export async function updateSchool(req: Request, res: Response) {
  const result = await schoolService.updateSchool(req.params.id, req.body);
  sendSuccess(res, result);
}

export async function getBranding(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  if (req.params.id !== req.user.school_id) throw new ForbiddenError('Access denied');
  const data = await schoolService.getBranding(req.params.id);
  sendSuccess(res, data);
}

export async function updateBranding(req: Request, res: Response) {
  const { logo_url, primary_color } = req.body;
  const result = await schoolService.updateBranding(req.params.id, { logo_url, primary_color });
  sendSuccess(res, result);
}
