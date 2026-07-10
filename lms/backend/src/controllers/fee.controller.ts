import { Request, Response } from 'express';
import * as feeService from '../services/fee.service';
import * as receiptService from '../services/receipt.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { logger } from '../utils/logger';

export async function createFeeSchedule(req: Request, res: Response) {
  const result = await feeService.createFeeSchedule({ ...req.body, schoolId: req.user!.school_id });
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
    res.status(404).json({ success: false, message: 'Receipt not available' });
  }
}

export async function listFeeSchedules(req: Request, res: Response) {
  const academicYear = (req.query.academicYear as string) || req.activeAcademicYear;
  const result = await feeService.listFeeSchedules(req.user!.school_id, academicYear, req.query.classId as string);

  sendSuccess(res, result);
}

export async function getFeeSchedule(req: Request, res: Response) {
  const result = await feeService.getFeeSchedule(req.params.id);
  sendSuccess(res, result);
}

export async function recordPayment(req: Request, res: Response) {
  const result = await feeService.recordPayment({ ...req.body, schoolId: req.user!.school_id });
  sendCreated(res, result, 'Payment recorded');
}

export async function getStudentPayments(req: Request, res: Response) {
  const result = await feeService.getStudentPayments(req.params.studentId);
  sendSuccess(res, result);
}

export async function getOutstandingReport(req: Request, res: Response) {
  const result = await feeService.getOutstandingReport(req.user!.school_id);
  sendSuccess(res, result);
}
