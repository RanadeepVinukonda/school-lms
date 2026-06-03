import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createSubjectSchema, updateSubjectSchema, subjectQuerySchema } from "../../validators/subject.validator";
import * as subjectController from "./subject.controller";

const router = Router();

router.use(authenticate);

router.get("/", validate(subjectQuerySchema, "query"), subjectController.listSubjects);
router.get("/:id", subjectController.getSubjectById);
router.post("/", requireRole("admin"), validate(createSubjectSchema), subjectController.createSubject);
router.patch("/:id", requireRole("admin"), validate(updateSubjectSchema), subjectController.updateSubject);
router.delete("/:id", requireRole("admin"), subjectController.deleteSubject);

export default router;

