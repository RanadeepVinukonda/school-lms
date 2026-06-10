import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';
import { sendSuccess, sendPaginated, buildPaginationMeta } from '../utils/response';

export async function listAuditLogs(req: Request, res: Response) {
  const { items, total, page, limit } = await auditService.listAuditLogs(req.query as any);
  const pagination = buildPaginationMeta(total, page, limit);
  sendPaginated(res, items, pagination);
}

export async function recoverEntity(req: Request, res: Response) {
  const result = await auditService.recoverEntity(req.params.logId);
  const log = await auditService.getAuditLogById(req.params.logId);
  const entry = log as any;
  auditService.logAudit(auditService.adminAuditEntry(
    req as any, 'user.recover' as any,
    entry.targetId, entry.targetType, entry.targetName,
    { summary: `Recovered ${entry.targetType} "${entry.targetName}" from audit log` }
  ));
  sendSuccess(res, result, 'Entity recovered');
}
