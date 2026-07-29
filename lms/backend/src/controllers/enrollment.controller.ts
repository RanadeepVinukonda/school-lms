import type { Request, Response } from 'express';
import * as enrollmentService from '../services/enrollment-v2.service';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Get current student's enrollments and a consolidated list of concept release statuses
 * for all textbooks they have access to.
 */
export async function getMyEnrollments(req: Request, res: Response) {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const studentId = req.user.uid;
  const studentClassId = await enrollmentService.getStudentClassId(studentId);
  const enrollments = await enrollmentService.getStudentEnrollments(studentId);

  const textbooks = studentClassId
    ? await enrollmentService.getClassTextbooks(studentClassId)
    : [];

  const conceptReleases = studentClassId && textbooks.length > 0
    ? await enrollmentService.getConceptReleases(textbooks.map((t: Record<string, unknown>) => t.id as string))
    : [];

  sendSuccess(res, { enrollments, conceptReleases });
}
