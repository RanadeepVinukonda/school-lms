
import * as subjectService from "../../services/subject.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";

export const listSubjects = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const filters: Record<string, unknown> = {};
  if (req.query.code) filters.code = req.query.code;
  if (req.query.department) filters.department = req.query.department;
  const result = await subjectService.listSubjects(filters, pagination);
  sendSuccess(res, "Subjects retrieved", {
    subjects: result.subjects,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id);
  sendSuccess(res, "Subject retrieved", subject);
});

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.body);
  sendCreated(res, "Subject created", subject);
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);
  sendSuccess(res, "Subject updated", subject);
});

export const deleteSubject = asyncHandler(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);
  sendNoContent(res);
});

