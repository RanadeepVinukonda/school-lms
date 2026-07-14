import { Request, Response } from 'express';
import * as testTemplateService from '../services/test-template.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createTemplate(req: Request, res: Response) {
  const result = await testTemplateService.createTemplate({ ...req.body, createdBy: req.user!.uid });
  sendCreated(res, result, 'Template created');
}

export async function updateTemplate(req: Request, res: Response) {
  const result = await testTemplateService.updateTemplate(req.params.id, req.user!.uid, req.body);
  sendSuccess(res, result, 'Template updated');
}

export async function deleteTemplate(req: Request, res: Response) {
  await testTemplateService.deleteTemplate(req.params.id, req.user!.uid);
  sendSuccess(res, null, 'Template deleted');
}

export async function getTemplate(req: Request, res: Response) {
  const result = await testTemplateService.getTemplate(req.params.id);
  sendSuccess(res, result);
}

export async function listTemplates(req: Request, res: Response) {
  const result = await testTemplateService.listTemplates(req.query as any);
  sendSuccess(res, result);
}

export async function compilePaper(req: Request, res: Response) {
  const result = await testTemplateService.compilePaper({ ...req.body, templateId: req.params.id, userId: req.user!.uid });
  sendSuccess(res, result, 'Question paper compiled successfully from template');
}
