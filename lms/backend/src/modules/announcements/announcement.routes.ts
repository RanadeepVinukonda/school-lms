import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createAnnouncementSchema, updateAnnouncementSchema } from "../../validators/announcement.validator";
import * as announcementController from "./announcement.controller";

const router = Router();

router.use(authenticate);

router.get("/", announcementController.listAnnouncements);
router.get("/:id", announcementController.getAnnouncementById);
router.post("/", requireRole("admin", "teacher"), validate(createAnnouncementSchema), announcementController.createAnnouncement);
router.patch("/:id", requireRole("admin", "teacher"), validate(updateAnnouncementSchema), announcementController.updateAnnouncement);
router.delete("/:id", requireRole("admin"), announcementController.deleteAnnouncement);

export default router;

