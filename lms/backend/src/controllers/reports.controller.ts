import type { Request, Response } from 'express';
import { getReportById, getLatestReport, generateReportPdf } from '../services/report.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getReport(req: Request, res: Response) {
  const report = await getReportById(req.params.id);
  if (!report) { sendError(res, 'Report not found', 404); return; }
  sendSuccess(res, report);
}

export async function getLatest(req: Request, res: Response) {
  const type = (req.query.type as string) || 'weekly';
  const report = await getLatestReport(type);
  if (!report) { sendError(res, 'Report not found', 404); return; }
  sendSuccess(res, report);
}

export async function downloadReportPdf(req: Request, res: Response) {
  const report = await getReportById(req.params.id);
  if (!report) { sendError(res, 'Report not found', 404); return; }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${(report as any).type}-report-${report.id}.pdf"`);

  const doc = generateReportPdf(report as Record<string, unknown>);
  doc.pipe(res);
}
