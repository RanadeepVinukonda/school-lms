import api from './api';
import type { ApiResponse } from '@/types';

export interface StaffRecord {
  id: string;
  user_id?: string;
  name: string;
  role: 'teacher' | 'non-teaching';
  department?: string;
  joining_date?: string;
  contract_url?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  created_at: string;
  staff?: StaffRecord;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
  staff?: StaffRecord;
}

export interface SalaryConfig {
  id: string;
  staff_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  staff_id: string;
  month: string;
  base_paid: number;
  allowances_paid: number;
  deductions_paid: number;
  net_salary: number;
  status: 'draft' | 'paid';
  payslip_url?: string;
  created_at: string;
  staff?: StaffRecord;
}

export const hrService = {
  // STAFF
  async getStaff() {
    const response = await api.get<ApiResponse<StaffRecord[]>>('/staff');
    return response.data;
  },
  async createStaff(data: Omit<StaffRecord, 'id' | 'created_at' | 'updated_at'>) {
    const response = await api.post<ApiResponse<StaffRecord>>('/staff', data);
    return response.data;
  },
  async updateStaff(id: string, data: Partial<StaffRecord>) {
    const response = await api.put<ApiResponse<StaffRecord>>(`/staff/${id}`, data);
    return response.data;
  },
  async deleteStaff(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/staff/${id}`);
    return response.data;
  },
  async markAttendance(data: { staff_id: string; date: string; status: 'present' | 'absent' | 'leave' }) {
    const response = await api.post<ApiResponse<StaffAttendance>>('/staff/attendance', data);
    return response.data;
  },
  async getAttendanceReport(dateStart: string, dateEnd: string) {
    const response = await api.get<ApiResponse<StaffAttendance[]>>('/staff/attendance/report', { params: { dateStart, dateEnd } });
    return response.data;
  },

  // LEAVE
  async getLeaves() {
    const response = await api.get<ApiResponse<LeaveRequest[]>>('/leaves');
    return response.data;
  },
  async requestLeave(data: { staff_id: string; start_date: string; end_date: string; reason?: string }) {
    const response = await api.post<ApiResponse<LeaveRequest>>('/leaves', data);
    return response.data;
  },
  async updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
    const response = await api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}/status`, { status });
    return response.data;
  },

  // PAYROLL
  async getSalaryConfig(staffId: string) {
    const response = await api.get<ApiResponse<SalaryConfig>>(`/payroll/config/${staffId}`);
    return response.data;
  },
  async configureSalary(data: { staff_id: string; base_salary: number; allowances?: number; deductions?: number }) {
    const response = await api.post<ApiResponse<SalaryConfig>>('/payroll/config', data);
    return response.data;
  },
  async getPayrollRuns(month: string) {
    const response = await api.get<ApiResponse<PayrollRun[]>>('/payroll/runs', { params: { month } });
    return response.data;
  },
  async runPayroll(data: { staff_id: string; month: string }) {
    const response = await api.post<ApiResponse<PayrollRun>>('/payroll/runs', data);
    return response.data;
  },
  getPayslipDownloadUrl(id: string) {
    return `${api.defaults.baseURL}/payroll/runs/${id}/payslip`;
  },
};
