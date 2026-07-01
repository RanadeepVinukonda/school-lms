import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as transportService from '../services/transport.service';

const router = Router();

// ROUTES endpoints
router.get('/routes', authenticate, asyncHandler(async (req, res) => {
  const routes = await transportService.getRoutes(req.user!.school_id || '');
  sendSuccess(res, routes);
}));

router.post('/routes', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().min(1, 'Route name is required'),
    vehicle_number: z.string().optional(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.createRoute(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.get('/routes/:id', authenticate, asyncHandler(async (req, res) => {
  const route = await transportService.getRouteById(req.params.id);
  sendSuccess(res, route);
}));

router.put('/routes/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    vehicle_number: z.string().optional(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.updateRoute(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/routes/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await transportService.deleteRoute(req.params.id);
  sendSuccess(res, null, 'Route deleted successfully');
}));

// STOPS endpoints
router.get('/routes/:routeId/stops', authenticate, asyncHandler(async (req, res) => {
  const stops = await transportService.getStops(req.params.routeId);
  sendSuccess(res, stops);
}));

router.post('/stops', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    route_id: z.string().uuid(),
    name: z.string().min(1, 'Stop name is required'),
    pickup_time: z.string().optional(),
    drop_time: z.string().optional(),
    fare: z.number().optional(),
    sequence: z.number().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.createStop(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/stops/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    pickup_time: z.string().optional(),
    drop_time: z.string().optional(),
    fare: z.number().optional(),
    sequence: z.number().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.updateStop(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/stops/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await transportService.deleteStop(req.params.id);
  sendSuccess(res, null, 'Stop deleted successfully');
}));

// ASSIGNMENTS endpoints
router.post('/assignments', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({
    student_id: z.string().uuid(),
    route_id: z.string().uuid(),
    stop_id: z.string().uuid().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.assignStudent(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.get('/assignments/student/:studentId', authenticate, asyncHandler(async (req, res) => {
  const assignment = await transportService.getStudentAssignment(req.params.studentId);
  sendSuccess(res, assignment);
}));

router.delete('/assignments/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await transportService.deleteAssignment(req.params.id);
  sendSuccess(res, null, 'Assignment removed successfully');
}));

// ATTENDANCE endpoints
router.post('/attendance', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({
    student_id: z.string().uuid(),
    route_id: z.string().uuid(),
    status: z.enum(['boarded', 'alighted', 'absent']),
    direction: z.enum(['morning', 'evening']),
  })),
  asyncHandler(async (req, res) => {
    const result = await transportService.markAttendance(req.user!.school_id || '', req.user!.uid, req.body);
    sendSuccess(res, result);
  })
);

router.get('/attendance', authenticate,
  validate(z.object({
    routeId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    direction: z.enum(['morning', 'evening']),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { routeId, date, direction } = req.query as any;
    const list = await transportService.getAttendance(req.user!.school_id || '', routeId, date, direction);
    sendSuccess(res, list);
  })
);

export default router;
