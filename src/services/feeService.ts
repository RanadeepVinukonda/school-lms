import api from './api';
import type { ApiResponse } from '@/types';

export interface FeeSchedule {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  classId: string;
  academicYear: string;
  description?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  feeScheduleId: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId?: string;
  status: string;
  paymentDate: string;
}

export interface OutstandingReport {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  schedules: Array<{ scheduleId: string; name: string; amount: number; paid: number }>;
}

export const feeService = {
  async createFeeSchedule(data: { name: string; amount: number; dueDate: string; classId: string; academicYear: string; description?: string }) {
    const response = await api.post<ApiResponse<FeeSchedule>>('/fee/schedules', data);
    return response.data;
  },

  async listFeeSchedules(classId?: string, academicYear?: string) {
    const response = await api.get<ApiResponse<FeeSchedule[]>>('/fee/schedules', { params: { classId, academicYear } });
    return response.data;
  },

  async getFeeSchedule(id: string) {
    const response = await api.get<ApiResponse<FeeSchedule>>(`/fee/schedules/${id}`);
    return response.data;
  },

  async recordPayment(data: { studentId: string; feeScheduleId: string; amountPaid: number; paymentMethod: string; transactionId?: string }) {
    const response = await api.post<ApiResponse<PaymentRecord>>('/fee/payments', data);
    return response.data;
  },

  async getStudentPayments(studentId: string) {
    const response = await api.get<ApiResponse<PaymentRecord[]>>(`/fee/payments/student/${studentId}`);
    return response.data;
  },

  async getClassPayments(classId: string) {
    const response = await api.get<ApiResponse<PaymentRecord[]>>(`/fee/payments/class/${classId}`);
    return response.data;
  },

  async getOutstandingReport() {
    const response = await api.get<ApiResponse<OutstandingReport[]>>('/fee/reports/outstanding');
    return response.data;
  },
};
