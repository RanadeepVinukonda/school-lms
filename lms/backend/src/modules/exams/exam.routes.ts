import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createExamSchema, updateExamSchema, scheduleExamSchema, gradeAttemptSchema } from "../../validators/exam.validator";
import * as examController from "./exam.controller";

const router = Router();

router.use(authenticate);

router.get("/course/:courseId", examController.listExamsByCourse);
router.get("/:id", examController.getExamById);
router.get("/:id/results", examController.getResults);
router.post("/", requireRole("admin", "teacher"), validate(createExamSchema), examController.createExam);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateExamSchema), examController.updateExam);
router.delete("/:id", requireRole("admin", "teacher"), examController.deleteExam);
router.patch("/:id/schedule", requireRole("admin", "teacher"), validate(scheduleExamSchema), examController.scheduleExam);
router.post("/:id/start", examController.startAttempt);
router.post("/attempts/:attemptId/submit", examController.submitAttempt);
router.patch("/attempts/:attemptId/grade", requireRole("admin", "teacher"), validate(gradeAttemptSchema), examController.gradeAttempt);

export default router;

