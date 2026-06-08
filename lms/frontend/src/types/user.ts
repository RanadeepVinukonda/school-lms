import { UserRole } from './auth';

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

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  weeklyDigest: boolean;
}
