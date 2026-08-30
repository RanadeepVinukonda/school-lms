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

export interface InvoiceScheduleOption {
  scheduleId: string;
  name: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string | null;
  academicYear: string | null;
}

export interface InvoicePreviewData {
  student: Record<string, any> | null;
  parent: Record<string, any> | null;
  className: string | null;
  schedules: InvoiceScheduleOption[];
  previousDue: number;
  totalOutstanding: number;
}

export interface InvoiceComputed {
  invoice: {
    id: string;
    invoice_number: string;
    student_id: string;
    parent_id?: string | null;
    school_id?: string | null;
    fee_structure_id: string;
    discount: number;
    payment_method?: string | null;
    transaction_id?: string | null;
    payment_date?: string | null;
    created_at?: string;
  };
  student: Record<string, any> | null;
  parent: Record<string, any> | null;
  feeStructure: Record<string, any> | null;
  className: string | null;
  schoolName: string | null;
  feeAmount: number;
  amountPaid: number;
  previousDue: number;
  discount: number;
  total: number;
  balance: number;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Pending';
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

  async updateFeeSchedule(id: string, data: Partial<Pick<FeeSchedule, 'name' | 'amount' | 'dueDate' | 'classId' | 'academicYear' | 'description'>>) {
    const response = await api.put<ApiResponse<FeeSchedule>>(`/fee/schedules/${id}`, data);
    return response.data;
  },

  async deleteFeeSchedule(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/fee/schedules/${id}`);
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

  async getInvoicePreviewData(studentId: string) {
    const response = await api.get<ApiResponse<InvoicePreviewData>>(`/fee/invoices/available/${studentId}`);
    return response.data;
  },

  async listInvoices() {
    const response = await api.get<ApiResponse<InvoiceComputed[]>>('/fee/invoices');
    return response.data;
  },

  async createInvoice(data: { studentId: string; feeStructureId: string; discount?: number; paymentMethod?: string; transactionId?: string; paymentDate?: string }) {
    const response = await api.post<ApiResponse<InvoiceComputed>>('/fee/invoices', data);
    return response.data;
  },

  async deleteInvoice(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/fee/invoices/${id}`);
    return response.data;
  },

  invoicePdfUrl(id: string, inline = false) {
    return `/api/fee/invoices/${id}/pdf${inline ? '?inline=1' : ''}`;
  },
};
