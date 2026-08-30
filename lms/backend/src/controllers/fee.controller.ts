import { Request, Response } from 'express';
import * as feeService from '../services/fee.service';
import * as receiptService from '../services/receipt.service';
import * as invoiceService from '../services/invoice.service';
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

export async function createInvoice(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await invoiceService.createInvoice({ ...req.body, schoolId: user.school_id });
  sendCreated(res, result, 'Invoice created');
}

export async function listInvoices(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await invoiceService.listInvoices(user.school_id);
  sendSuccess(res, result);
}

export async function getInvoice(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await invoiceService.getInvoice(req.params.id, user.school_id);
  sendSuccess(res, result);
}

export async function deleteInvoice(req: Request, res: Response) {
  const user = requireUser(req);
  await invoiceService.deleteInvoice(req.params.id, user.school_id);
  sendSuccess(res, null, 'Invoice deleted');
}

export async function getInvoicePreviewData(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await invoiceService.getInvoicePreviewData(req.params.studentId, user.school_id);
  sendSuccess(res, result);
}

export async function downloadInvoice(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const pdf = await invoiceService.generateInvoicePdf(req.params.id, user.school_id);
    const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="invoice-${req.params.id.slice(0, 8)}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    logger.error('Invoice generation failed', { invoiceId: req.params.id, error: err instanceof Error ? err.message : String(err) });
    sendError(res, 'Invoice not available', 404);
  }
}
