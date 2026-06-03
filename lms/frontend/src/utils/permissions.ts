import type { UserRole } from '@/types';
import { ROLE_HIERARCHY } from '@/lib/constants';

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isTeacher(role: UserRole): boolean {
  return role === 'teacher';
}

export function isStudent(role: UserRole): boolean {
  return role === 'student';
}

export function canManageUsers(role: UserRole): boolean {
  return isAdmin(role);
}

export function canManageCourses(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'teacher';
}

export function canManageGrades(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'teacher';
}

export function canViewAnalytics(role: UserRole): boolean {
  return isAdmin(role) || isTeacher(role);
}

export function canManageSystem(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canCreateContent(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'teacher';
}

export const PERMISSIONS = {
  VIEW_DASHBOARD: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  MANAGE_USERS: ['super_admin', 'admin'],
  MANAGE_COURSES: ['super_admin', 'admin', 'teacher'],
  VIEW_COURSES: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  MANAGE_GRADES: ['super_admin', 'admin', 'teacher'],
  VIEW_GRADES: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  MANAGE_ASSIGNMENTS: ['super_admin', 'admin', 'teacher'],
  SUBMIT_ASSIGNMENTS: ['student'],
  MANAGE_QUIZZES: ['super_admin', 'admin', 'teacher'],
  ATTEMPT_QUIZZES: ['student'],
  VIEW_ANALYTICS: ['super_admin', 'admin', 'teacher'],
  MANAGE_SYSTEM: ['super_admin'],
  VIEW_MESSAGES: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  SEND_MESSAGES: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function checkPermission(
  userRole: UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}
