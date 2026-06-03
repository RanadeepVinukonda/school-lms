
import * as analyticsService from "../../services/analytics.service";
import * as settingsService from "../../services/settings.service";
import { sendSuccess } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";

export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await analyticsService.getDashboardStats();
  sendSuccess(res, "Dashboard data retrieved", dashboard);
});

export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSystemSettings();
  sendSuccess(res, "System settings retrieved", settings);
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSystemSettings(req.body);
  sendSuccess(res, "System settings updated", settings);
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.params.id ?? "system");
  sendSuccess(res, "Settings retrieved", settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.params.id, req.body);
  sendSuccess(res, "Settings updated", settings);
});

