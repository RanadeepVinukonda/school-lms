import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../../validators/auth.validator";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register", authRateLimit, validate(registerSchema), authController.register);
router.post("/login", authRateLimit, validate(loginSchema), authController.login);
router.get("/verify", authRateLimit, authController.verifyToken);
router.post("/forgot-password", authRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimit, validate(resetPasswordSchema), authController.resetPassword);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.get("/profile", authenticate, authController.getProfile);
router.patch("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;

