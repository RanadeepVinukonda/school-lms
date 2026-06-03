import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { gradeSubmissionSchema } from "../../validators/assignment.validator";
import * as submissionController from "./submission.controller";

const router = Router();

router.use(authenticate);

router.get("/assignment/:assignmentId", requireRole("admin", "teacher"), submissionController.listSubmissions);
router.post("/assignment/:assignmentId", submissionController.submitAssignment);
router.patch("/:id/grade", requireRole("admin", "teacher"), validate(gradeSubmissionSchema), submissionController.gradeSubmission);

export default router;

