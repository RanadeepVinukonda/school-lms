import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createAssignmentSchema, updateAssignmentSchema, assignmentQuerySchema } from "../../validators/assignment.validator";
import * as assignmentController from "./assignment.controller";

const router = Router();

router.use(authenticate);

router.get("/course/:courseId", validate(assignmentQuerySchema, "query"), assignmentController.listAssignmentsByCourse);
router.get("/:id", assignmentController.getAssignmentById);
router.post("/", requireRole("admin", "teacher"), validate(createAssignmentSchema), assignmentController.createAssignment);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateAssignmentSchema), assignmentController.updateAssignment);
router.delete("/:id", requireRole("admin", "teacher"), assignmentController.deleteAssignment);

export default router;

