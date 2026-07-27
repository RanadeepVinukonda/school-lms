import { Request, Response } from 'express';
import * as tcsService from '../services/teacher-class-subject.service';
import { getSupabaseClient } from '../services/supabase';
import { sendSuccess, sendCreated } from '../utils/response';
import { requireUser } from '../types/common';

export async function assignTeacher(req: Request, res: Response) {
  const result = await tcsService.assignTeacher(req.body);
  sendCreated(res, result, 'Teacher assigned');
}

export async function setupTeacher(req: Request, res: Response) {
  const user = requireUser(req);
  const { classIds, subjectAssignments } = req.body;
  const uid = user.uid;
  const results = [];
  for (const sa of subjectAssignments) {
    const result = await tcsService.assignTeacher({
      teacherId: uid,
      classId: sa.classId,
      subjectId: sa.subjectId,
    });
    results.push(result);
  }
  await getSupabaseClient().from('users').update({
    class_ids: classIds,
    updated_at: new Date().toISOString(),
  }).eq('id', uid);
  sendCreated(res, {
    assignments: results,
    classIds,
  }, 'Teacher setup complete');
}

export async function getMyAssignments(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await tcsService.getTeacherAssignments(user.uid);
  sendSuccess(res, result);
}

export async function getAssignmentForClass(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await tcsService.getTeacherAssignment(user.uid, req.params.classId);
  sendSuccess(res, result);
}

export async function getUnassignedSubjects(req: Request, res: Response) {
  const result = await tcsService.getUnassignedSubjects(req.params.classId);
  sendSuccess(res, result);
}

export async function getAllAssignments(_req: Request, res: Response) {
  const result = await tcsService.getAllAssignments();
  sendSuccess(res, result);
}

export async function removeAssignment(req: Request, res: Response) {
  await tcsService.removeAssignment(req.params.assignmentId);
  sendSuccess(res, null, 'Assignment removed');
}
