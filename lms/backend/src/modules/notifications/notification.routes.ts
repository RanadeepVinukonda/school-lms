import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { notificationPreferencesSchema } from "../../validators/settings.validator";
import * as notificationController from "./notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", notificationController.getNotifications);
router.patch("/:id/read", notificationController.markNotificationRead);
router.post("/read-all", notificationController.markAllRead);
router.get("/preferences", notificationController.getPreferences);
router.patch("/preferences", validate(notificationPreferencesSchema), notificationController.updatePreferences);
router.post("/bulk", requireRole("admin"), notificationController.createBulkNotifications);

export default router;

