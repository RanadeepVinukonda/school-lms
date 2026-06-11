import { Request, Response } from 'express';
import * as testScheduleService from '../services/test-schedule.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createSchedule(req: Request, res: Response) {
  const result = await testScheduleService.createSchedule({ ...req.body, createdBy: req.user!.uid });
  sendCreated(res, result, 'Test scheduled');
}

export async function approveSchedule(req: Request, res: Response) {
  const result = await testScheduleService.approveSchedule(req.params.id, req.user!.uid);
  sendSuccess(res, result, 'Schedule approved');
}

export async function updateScheduleStatus(req: Request, res: Response) {
  const result = await testScheduleService.updateScheduleStatus(req.params.id, req.user!.uid, req.body.status);
  sendSuccess(res, result, 'Schedule status updated');
}

export async function deleteSchedule(req: Request, res: Response) {
  await testScheduleService.deleteSchedule(req.params.id, req.user!.uid);
  sendSuccess(res, null, 'Schedule deleted');
}

export async function getSchedule(req: Request, res: Response) {
  const result = await testScheduleService.getSchedule(req.params.id);
  sendSuccess(res, result);
}

export async function listSchedules(req: Request, res: Response) {
  const result = await testScheduleService.listSchedules(req.query as any);
  sendSuccess(res, result);
}
