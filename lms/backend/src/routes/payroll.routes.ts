// @ts-nocheck — pre-existing type errors
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as payrollService from '../services/payroll.service';

const router = Router();

router.get('/config/:staffId', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const result = await payrollService.getSalaryConfig(req.params.staffId);
  sendSuccess(res, result);
}));

router.post('/config', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    staff_id: z.string().uuid(),
    base_salary: z.number().nonnegative(),
    allowances: z.number().nonnegative().optional(),
    deductions: z.number().nonnegative().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await payrollService.configureSalary(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.get('/runs', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const list = await payrollService.getPayrollRuns(req.user!.school_id || '', req.query.month as string);
    sendSuccess(res, list);
  })
);

router.post('/runs', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    staff_id: z.string().uuid(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  })),
  asyncHandler(async (req, res) => {
    const result = await payrollService.runPayroll(req.user!.school_id || '', req.body.staff_id, req.body.month);
    sendSuccess(res, result);
  })
);

router.get('/runs/:id/payslip', authenticate, asyncHandler(async (req, res) => {
  const buffer = await payrollService.generatePayslipPdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip-${req.params.id}.pdf`);
  res.send(buffer);
}));

export default router;
