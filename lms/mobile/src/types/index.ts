export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  address?: string;
  classIds?: string[];
  studentId?: string;
  teacherId?: string;
  classId?: string;
  tutorialSeen?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  studentId?: string;
  classId?: string;
  rollNo?: number;
  academicYear?: string;
  createdAt: string;
  updatedAt: string;
}
