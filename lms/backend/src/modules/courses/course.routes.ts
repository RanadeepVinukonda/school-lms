import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  enrollStudentSchema,
} from "../../validators/course.validator";
import * as courseController from "./course.controller";

const router = Router();

router.use(authenticate);

router.get("/", validate(courseQuerySchema, "query"), courseController.listCourses);
router.get("/:id", courseController.getCourseById);
router.post("/", requireRole("admin", "teacher"), validate(createCourseSchema), courseController.createCourse);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateCourseSchema), courseController.updateCourse);
router.delete("/:id", requireRole("admin"), courseController.deleteCourse);
router.post("/:id/enroll", requireRole("admin", "teacher"), validate(enrollStudentSchema), courseController.enrollStudent);
router.post("/:id/unenroll", requireRole("admin", "teacher"), validate(enrollStudentSchema), courseController.unenrollStudent);
router.get("/:id/enrollments", requireRole("admin", "teacher"), courseController.getEnrollments);

export default router;

