import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as enrollmentController from "./enrollment.controller";

const router = Router();

router.use(authenticate);

router.get("/my", enrollmentController.getMyEnrollments);
router.post("/course/:courseId", enrollmentController.enrollMe);
router.delete("/course/:courseId", enrollmentController.unenrollMe);
router.get("/course/:courseId", requireRole("admin", "teacher"), enrollmentController.getEnrollmentsByCourse);

export default router;

