import api from './api';
import type { ApiResponse } from '@/types';

export interface TransportRoute {
  id: string;
  name: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface TransportStop {
  id: string;
  route_id: string;
  name: string;
  pickup_time?: string;
  drop_time?: string;
  fare?: number;
  sequence?: number;
  created_at: string;
  updated_at: string;
}

export interface TransportAssignment {
  id: string;
  student_id: string;
  route_id: string;
  stop_id?: string;
  created_at: string;
  updated_at: string;
  route?: TransportRoute;
  stop?: TransportStop;
}

export interface TransportAttendance {
  id: string;
  student_id: string;
  route_id: string;
  status: 'boarded' | 'alighted' | 'absent';
  direction: 'morning' | 'evening';
  marked_by: string;
  marked_at: string;
  student?: { id: string; display_name: string };
}

export const transportService = {
  async getRoutes() {
    const response = await api.get<ApiResponse<TransportRoute[]>>('/transport/routes');
    return response.data;
  },

  async getRoute(id: string) {
    const response = await api.get<ApiResponse<TransportRoute>>(`/transport/routes/${id}`);
    return response.data;
  },

  async createRoute(data: { name: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
    const response = await api.post<ApiResponse<TransportRoute>>('/transport/routes', data);
    return response.data;
  },

  async updateRoute(id: string, data: { name?: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
    const response = await api.put<ApiResponse<TransportRoute>>(`/transport/routes/${id}`, data);
    return response.data;
  },

  async deleteRoute(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/transport/routes/${id}`);
    return response.data;
  },

  async getStops(routeId: string) {
    const response = await api.get<ApiResponse<TransportStop[]>>(`/transport/routes/${routeId}/stops`);
    return response.data;
  },

  async createStop(data: { route_id: string; name: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
    const response = await api.post<ApiResponse<TransportStop>>('/transport/stops', data);
    return response.data;
  },

  async updateStop(id: string, data: { name?: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
    const response = await api.put<ApiResponse<TransportStop>>(`/transport/stops/${id}`, data);
    return response.data;
  },

  async deleteStop(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/transport/stops/${id}`);
    return response.data;
  },

  async assignStudent(data: { student_id: string; route_id: string; stop_id?: string }) {
    const response = await api.post<ApiResponse<TransportAssignment>>('/transport/assignments', data);
    return response.data;
  },

  async getStudentAssignment(studentId: string) {
    const response = await api.get<ApiResponse<TransportAssignment | null>>(`/transport/assignments/student/${studentId}`);
    return response.data;
  },

  async deleteAssignment(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/transport/assignments/${id}`);
    return response.data;
  },

  async markAttendance(data: { student_id: string; route_id: string; status: 'boarded' | 'alighted' | 'absent'; direction: 'morning' | 'evening' }) {
    const response = await api.post<ApiResponse<TransportAttendance>>('/transport/attendance', data);
    return response.data;
  },

  async getAttendance(params: { routeId: string; date: string; direction: 'morning' | 'evening' }) {
    const response = await api.get<ApiResponse<TransportAttendance[]>>('/transport/attendance', { params });
    return response.data;
  },
};
