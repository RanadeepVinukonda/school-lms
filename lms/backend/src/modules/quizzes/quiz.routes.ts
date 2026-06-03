import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createQuizSchema, updateQuizSchema, submitAttemptSchema } from "../../validators/quiz.validator";
import * as quizController from "./quiz.controller";

const router = Router();

router.use(authenticate);

router.get("/course/:courseId", quizController.listQuizzesByCourse);
router.get("/:id", quizController.getQuizById);
router.get("/:id/results", quizController.getResults);
router.post("/", requireRole("admin", "teacher"), validate(createQuizSchema), quizController.createQuiz);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateQuizSchema), quizController.updateQuiz);
router.delete("/:id", requireRole("admin", "teacher"), quizController.deleteQuiz);
router.post("/:id/start", quizController.startAttempt);
router.post("/:id/submit", validate(submitAttemptSchema), quizController.submitAttempt);

export default router;

