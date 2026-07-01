import { Request, Response } from 'express';
import * as tcsService from '../services/teacher-class-subject.service';
import { collections } from '../database/adapter';
import { sendSuccess, sendCreated } from '../utils/response';

export async function assignTeacher(req: Request, res: Response) {
  const result = await tcsService.assignTeacher(req.body);
  sendCreated(res, result, 'Teacher assigned');
}

export async function setupTeacher(req: Request, res: Response) {
  const { classIds, subjectAssignments } = req.body;
  const uid = req.user!.uid;
  const results = [];
  for (const sa of subjectAssignments) {
    const result = await tcsService.assignTeacher({
      teacherId: uid,
      classId: sa.classId,
      subjectId: sa.subjectId,
    });
    results.push(result);
  }
  await collections.users().doc(uid).update({
    classIds,
    tutorialSeen: false,
    updatedAt: new Date().toISOString(),
  });
  sendCreated(res, {
    assignments: results,
    classIds,
  }, 'Teacher setup complete');
}

export async function getMyAssignments(req: Request, res: Response) {
  const result = await tcsService.getTeacherAssignments(req.user!.uid);
  sendSuccess(res, result);
}

export async function getAssignmentForClass(req: Request, res: Response) {
  const result = await tcsService.getTeacherAssignment(req.user!.uid, req.params.classId);
  sendSuccess(res, result);
}

export async function getUnassignedSubjects(req: Request, res: Response) {
  const result = await tcsService.getUnassignedSubjects(req.params.classId);
  sendSuccess(res, result);
}

export async function getAllAssignments(req: Request, res: Response) {
  const result = await tcsService.getAllAssignments();
  sendSuccess(res, result);
}

export async function removeAssignment(req: Request, res: Response) {
  await tcsService.removeAssignment(req.params.assignmentId);
  sendSuccess(res, null, 'Assignment removed');
}
