import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as transportService from '../services/transport.service';
import {
  createRouteSchema,
  updateRouteSchema,
  createStopSchema,
  updateStopSchema,
  assignStudentSchema,
  markAttendanceSchema,
  attendanceQuerySchema,
} from '../validators/transport.validator';

const router = Router();

// ROUTES endpoints
router.get('/routes', authenticate, asyncHandler(async (req, res) => {
  const routes = await transportService.getRoutes(req.user!.school_id || '');
  sendSuccess(res, routes);
}));

router.post('/routes', authenticate, requireRole('admin', 'super_admin'),
  validate(createRouteSchema),
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
  validate(updateRouteSchema),
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
  validate(createStopSchema),
  asyncHandler(async (req, res) => {
    const result = await transportService.createStop(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/stops/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(updateStopSchema),
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
  validate(assignStudentSchema),
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
  validate(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const result = await transportService.markAttendance(req.user!.school_id || '', req.user!.uid, req.body);
    sendSuccess(res, result);
  })
);

router.get('/attendance', authenticate,
  validate(attendanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { routeId, date, direction } = req.query as any;
    const list = await transportService.getAttendance(req.user!.school_id || '', routeId, date, direction);
    sendSuccess(res, list);
  })
);

export default router;
