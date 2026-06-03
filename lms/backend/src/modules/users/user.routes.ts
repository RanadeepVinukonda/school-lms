import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createUserSchema,
  updateUserSchema,
  assignRoleSchema,
  userQuerySchema,
} from "../../validators/user.validator";
import * as userController from "./user.controller";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("admin", "teacher"), validate(userQuerySchema, "query"), userController.listUsers);
router.get("/:id", userController.getUserById);
router.post("/", requireRole("admin"), validate(createUserSchema), userController.createUser);
router.patch("/:id", requireRole("admin"), validate(updateUserSchema), userController.updateUser);
router.delete("/:id", requireRole("admin"), userController.deleteUser);
router.patch("/:id/role", requireRole("admin"), validate(assignRoleSchema), userController.assignRole);

export default router;

