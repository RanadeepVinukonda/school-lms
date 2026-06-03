import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { updateSettingsSchema } from "../../validators/settings.validator";
import * as adminController from "./admin.controller";

const router = Router();

router.use(authenticate);
router.use(requireRole("admin"));

router.get("/dashboard", adminController.getDashboard);
router.get("/settings/system", adminController.getSystemSettings);
router.patch("/settings/system", validate(updateSettingsSchema), adminController.updateSystemSettings);
router.get("/settings/:id", adminController.getSettings);
router.patch("/settings/:id", validate(updateSettingsSchema), adminController.updateSettings);

export default router;

