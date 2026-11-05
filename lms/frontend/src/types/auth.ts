export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginInput {
  email?: string;
  password?: string;
  phone?: string;
  rememberMe?: boolean;
}

export interface RegisterInput {
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  displayName: string;
  role: UserRole;
  termsAccepted: boolean;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  password: string;
  confirmPassword: string;
}

export interface OtpLoginInput {
  phone: string;
}

export interface OtpVerifyInput {
  phone: string;
  token: string;
}
