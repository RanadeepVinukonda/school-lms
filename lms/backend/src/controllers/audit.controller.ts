import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';
import { sendSuccess, sendError, sendPaginated, buildPaginationMeta } from '../utils/response';
import type { ReqWithUser, QueryParams } from '../types/common';
import type { AuditAction } from '../services/audit.service';

export async function listAuditLogs(req: Request, res: Response) {
  const { items, total, page, limit } = await auditService.listAuditLogs(req.query as QueryParams);
  const pagination = buildPaginationMeta(total, page, limit);
  sendPaginated(res, items, pagination);
}

export async function recoverEntity(req: Request, res: Response) {
  const user = (req as ReqWithUser).user;
  if (!user || user.role !== 'admin') {
    sendError(res, 'Only admins can recover entities', 403);
    return;
  }
  const result = await auditService.recoverEntity(req.params.logId);
  const log = await auditService.getAuditLogById(req.params.logId);
  const entry = log as unknown as { targetId: string; targetType: string; targetName: string; };
  auditService.logAudit(auditService.adminAuditEntry(
    req as ReqWithUser, 'user.recover' as AuditAction,
    entry.targetId, entry.targetType, entry.targetName,
    { summary: `Recovered ${entry.targetType} "${entry.targetName}" from audit log` }
  ));
  sendSuccess(res, result, 'Entity recovered');
}
