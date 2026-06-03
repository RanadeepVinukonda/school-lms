export type NotificationType = 'assignment' | 'grade' | 'message' | 'announcement' | 'reminder' | 'system' | 'course';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  email: {
    assignments: boolean;
    grades: boolean;
    messages: boolean;
    announcements: boolean;
    reminders: boolean;
  };
  push: {
    assignments: boolean;
    grades: boolean;
    messages: boolean;
    announcements: boolean;
    reminders: boolean;
  };
  sms: {
    assignments: boolean;
    grades: boolean;
    urgentOnly: boolean;
  };
}
