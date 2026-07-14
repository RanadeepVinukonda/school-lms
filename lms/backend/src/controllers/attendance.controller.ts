import { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export async function markAttendance(req: Request, res: Response) {
  const result = await attendanceService.markAttendance({
    ...req.body,
    schoolId: req.user!.school_id,
  });
  sendCreated(res, result, 'Attendance marked');
}

export async function getClassAttendance(req: Request, res: Response) {
  const result = await attendanceService.getClassAttendance(req.params.classId, req.query.date as string);
  sendSuccess(res, result);
}

export async function getStudentAttendance(req: Request, res: Response) {
  const result = await attendanceService.getStudentAttendance(req.params.studentId);
  sendSuccess(res, result);
}

export async function getAttendanceReport(req: Request, res: Response) {
  const result = await attendanceService.getAttendanceReport(req.params.classId);
  sendSuccess(res, result);
}

export async function exportAttendanceCSV(req: Request, res: Response) {
  const csv = await attendanceService.exportAttendanceCSV(req.params.classId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-${req.params.classId}.csv`);
  res.send(csv);
}
