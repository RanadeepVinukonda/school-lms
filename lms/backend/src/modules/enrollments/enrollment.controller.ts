
import { collections } from "../../firebase/firestore";
import * as courseService from "../../services/course.service";
import { sendSuccess } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const enrollMe = asyncHandler(async (req: AuthRequest, res) => {
  const enrollment = await courseService.enrollStudent(req.params.courseId, req.user!.id);
  sendSuccess(res, "Enrolled successfully", enrollment);
});

export const unenrollMe = asyncHandler(async (req: AuthRequest, res) => {
  await courseService.unenrollStudent(req.params.courseId, req.user!.id);
  sendSuccess(res, "Unenrolled successfully");
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res) => {
  const snapshot = await collections.enrollments.where("studentId", "==", req.user!.id).get();
  const enrollments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  sendSuccess(res, "My enrollments retrieved", { enrollments });
});

export const getEnrollmentsByCourse = asyncHandler(async (req, res) => {
  const enrollments = await courseService.getEnrollments(req.params.courseId);
  sendSuccess(res, "Enrollments retrieved", { enrollments });
});

