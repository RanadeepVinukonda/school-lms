import { Request, Response } from 'express';
import * as feeService from '../services/fee.service';
import * as receiptService from '../services/receipt.service';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { requireUser } from '../types/common';

export async function createFeeSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.createFeeSchedule({ ...req.body, schoolId: user.school_id });
  sendCreated(res, result, 'Fee schedule created');
}

export async function downloadReceipt(req: Request, res: Response) {
  try {
    const pdf = await receiptService.generateReceipt(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    logger.error('Receipt generation failed', { paymentId: req.params.id, error: err instanceof Error ? err.message : String(err) });
    sendError(res, 'Receipt not available', 404);
  }
}

export async function listFeeSchedules(req: Request, res: Response) {
  const user = requireUser(req);
  const academicYear = req.query.academicYear as string | undefined;
  const result = await feeService.listFeeSchedules(user.school_id, academicYear, req.query.classId as string);

  sendSuccess(res, result);
}

export async function getFeeSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.getFeeSchedule(req.params.id, user.school_id);
  sendSuccess(res, result);
}

export async function updateFeeSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.updateFeeSchedule(req.params.id, req.body, user.school_id);
  sendSuccess(res, result, 'Fee schedule updated');
}

export async function deleteFeeSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  await feeService.deleteFeeSchedule(req.params.id, user.school_id);
  sendSuccess(res, null, 'Fee schedule deleted');
}

export async function recordPayment(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.recordPayment({ ...req.body, schoolId: user.school_id });
  sendCreated(res, result, 'Payment recorded');
}

export async function getStudentPayments(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.getStudentPayments(req.params.studentId, user.school_id);
  sendSuccess(res, result);
}

export async function getOutstandingReport(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await feeService.getOutstandingReport(user.school_id);
  sendSuccess(res, result);
}
