import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { updateSettingsSchema } from "../../validators/settings.validator";
import * as schoolController from "./school.controller";

const router = Router();

router.use(authenticate);

router.get("/profile", schoolController.getSchoolProfile);
router.get("/:id", schoolController.getSchoolProfile);
router.patch("/:id", requireRole("admin"), validate(updateSettingsSchema), schoolController.updateSchoolProfile);
router.get("/settings/system", requireRole("admin"), schoolController.getSystemSettings);
router.patch("/settings/system", requireRole("admin"), validate(updateSettingsSchema), schoolController.updateSystemSettings);

export default router;

