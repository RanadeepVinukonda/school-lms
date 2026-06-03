import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createClassSchema, updateClassSchema, classQuerySchema } from "../../validators/class.validator";
import * as classController from "./class.controller";

const router = Router();

router.use(authenticate);

router.get("/", validate(classQuerySchema, "query"), classController.listClasses);
router.get("/:id", classController.getClassById);
router.get("/:id/roster", requireRole("admin", "teacher"), classController.getRoster);
router.post("/", requireRole("admin"), validate(createClassSchema), classController.createClass);
router.patch("/:id", requireRole("admin"), validate(updateClassSchema), classController.updateClass);
router.delete("/:id", requireRole("admin"), classController.deleteClass);
router.post("/:id/students", requireRole("admin", "teacher"), classController.addStudents);
router.delete("/:id/students", requireRole("admin", "teacher"), classController.removeStudents);

export default router;

