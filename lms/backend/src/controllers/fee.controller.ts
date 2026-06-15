import { Request, Response } from 'express';
import * as feeService from '../services/fee.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createFeeSchedule(req: Request, res: Response) {
  const result = await feeService.createFeeSchedule(req.body);
  sendCreated(res, result, 'Fee schedule created');
}

export async function listFeeSchedules(req: Request, res: Response) {
  const result = await feeService.listFeeSchedules(req.query.classId as string, req.query.academicYear as string);
  sendSuccess(res, result);
}

export async function getFeeSchedule(req: Request, res: Response) {
  const result = await feeService.getFeeSchedule(req.params.id);
  sendSuccess(res, result);
}

export async function recordPayment(req: Request, res: Response) {
  const result = await feeService.recordPayment(req.body);
  sendCreated(res, result, 'Payment recorded');
}

export async function getStudentPayments(req: Request, res: Response) {
  const result = await feeService.getStudentPayments(req.params.studentId);
  sendSuccess(res, result);
}

export async function getClassPayments(req: Request, res: Response) {
  const result = await feeService.getClassPayments(req.params.classId);
  sendSuccess(res, result);
}

export async function getOutstandingReport(req: Request, res: Response) {
  const result = await feeService.getOutstandingReport();
  sendSuccess(res, result);
}
