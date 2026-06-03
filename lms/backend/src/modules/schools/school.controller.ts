
import * as settingsService from "../../services/settings.service";
import { sendSuccess } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const getSchoolProfile = asyncHandler(async (req: AuthRequest, res) => {
  const schoolId = req.params.id ?? req.user!.schoolId;
  const profile = await settingsService.getSettings(schoolId);
  sendSuccess(res, "School profile retrieved", profile);
});

export const updateSchoolProfile = asyncHandler(async (req, res) => {
  const profile = await settingsService.updateSettings(req.params.id, req.body);
  sendSuccess(res, "School profile updated", profile);
});

export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSystemSettings();
  sendSuccess(res, "System settings retrieved", settings);
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSystemSettings(req.body);
  sendSuccess(res, "System settings updated", settings);
});

