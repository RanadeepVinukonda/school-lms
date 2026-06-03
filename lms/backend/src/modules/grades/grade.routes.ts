import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { updateGradeSchema, gradebookQuerySchema, bulkGradeSchema } from "../../validators/grade.validator";
import * as gradeController from "./grade.controller";

const router = Router();

router.use(authenticate);

router.get("/my", gradeController.getStudentGrades);
router.get("/course/:courseId/gradebook", requireRole("admin", "teacher"), validate(gradebookQuerySchema, "query"), gradeController.getGradebook);
router.get("/course/:courseId/report", requireRole("admin", "teacher"), gradeController.generateReport);
router.get("/student/:studentId", requireRole("admin", "teacher", "parent"), gradeController.getStudentGrades);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateGradeSchema), gradeController.updateGrade);
router.post("/bulk", requireRole("admin", "teacher"), validate(bulkGradeSchema), gradeController.bulkUpdateGrades);

export default router;

