import api from './api';
import type { ApiResponse } from '@/types';

export interface LtiConfig {
  id?: string;
  school_id?: string;
  issuer: string;
  client_id: string;
  deployment_id: string;
  auth_token_url: string;
  auth_login_url: string;
  jwks_url: string;
}

export const ltiService = {
  async getConfig() {
    const response = await api.get<ApiResponse<LtiConfig | null>>('/lti/config');
    return response.data;
  },

  async saveConfig(data: LtiConfig) {
    const response = await api.post<ApiResponse<LtiConfig>>('/lti/config', data);
    return response.data;
  },

  async triggerLaunch(idToken: string) {
    const response = await api.post<ApiResponse<any>>('/lti/launch', { id_token: idToken });
    return response.data;
  },
};
