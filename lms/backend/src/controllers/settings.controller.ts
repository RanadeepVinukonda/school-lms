import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { sendSuccess } from '../utils/response';

export async function getSettings(_req: Request, res: Response) {
  const result = await settingsService.getSettings();
  sendSuccess(res, result);
}

export async function updateSettings(req: Request, res: Response) {
  const result = await settingsService.updateSettings(req.body);
  sendSuccess(res, result, 'Settings updated');
}

export async function getSystemSettings(_req: Request, res: Response) {
  const result = await settingsService.getSystemSettings();
  sendSuccess(res, result);
}

export async function updateSystemSettings(req: Request, res: Response) {
  const result = await settingsService.updateSystemSettings(req.body);
  sendSuccess(res, result, 'System settings updated');
}
