import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createLessonSchema, updateLessonSchema, reorderLessonsSchema } from "../../validators/lesson.validator";
import * as lessonController from "./lesson.controller";

const router = Router();

router.use(authenticate);

router.get("/course/:courseId", lessonController.listLessonsByCourse);
router.get("/:id", lessonController.getLessonById);
router.post("/", requireRole("admin", "teacher"), validate(createLessonSchema), lessonController.createLesson);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateLessonSchema), lessonController.updateLesson);
router.delete("/:id", requireRole("admin", "teacher"), lessonController.deleteLesson);
router.patch("/course/:courseId/reorder", requireRole("admin", "teacher"), validate(reorderLessonsSchema), lessonController.reorderLessons);
router.post("/:id/complete", lessonController.markLessonComplete);

export default router;

