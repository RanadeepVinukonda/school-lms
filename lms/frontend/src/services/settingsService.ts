import api from './api';
import type { ApiResponse } from '@/types';

export interface SystemSettings {
  schoolName: string;
  academicYear: string;
  semester: string;
  conceptFlaggingThreshold: number;
  gradingSystem?: {
    type: string;
    scale: number;
    passingGrade: string;
  };
  attendanceSettings?: {
    enableGeoFencing: boolean;
    gracePeriodMinutes: number;
    autoMarkAbsentAfter: number;
  };
  securitySettings?: {
    passwordMinLength: number;
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
    requireTwoFactor: boolean;
  };
  features?: Record<string, boolean>;
}

export const settingsService = {
  async getSettings() {
    const response = await api.get<ApiResponse<any>>('/settings');
    return response.data.data;
  },

  async updateSettings(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings', data);
    return response.data.data;
  },

  async getSystemSettings() {
    const response = await api.get<ApiResponse<SystemSettings>>('/settings/system');
    return response.data;
  },

  async updateSystemSettings(data: Partial<SystemSettings>) {
    const response = await api.put<ApiResponse<SystemSettings>>('/settings/system', data);
    return response.data;
  },
};
