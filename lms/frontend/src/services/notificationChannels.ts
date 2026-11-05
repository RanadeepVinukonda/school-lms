/**
 * Android notification channels — one per backend notification category.
 *
 * Channel ids MUST match the CATEGORIES ids in backend `push.mappings.ts`
 * (the backend sets `channelId` = category on every FCM message). Channels are
 * created lazily so the user can tune each category's sound/vibration in system
 * settings.
 */

export interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  /** 1 (min) … 5 (max); DEFAULT=3, HIGH=4 */
  importance: 1 | 2 | 3 | 4 | 5;
  sound?: string;
  vibration?: boolean;
  lights?: boolean;
}
export const NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  { id: 'assignments', name: 'Assignments', description: 'New, updated and graded assignments', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'homework', name: 'Homework', description: 'Homework created and due reminders', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'attendance', name: 'Attendance', description: 'Attendance marked and updates', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'exams', name: 'Exams & Tests', description: 'Exam and test schedules, reminders and releases', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'results', name: 'Results & Grades', description: 'Results, grades and report cards', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'quizzes', name: 'Quizzes', description: 'Quizzes published and graded', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'submissions', name: 'Submissions', description: 'Work submitted for review', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'evaluations', name: 'Evaluations & Feedback', description: 'AI grading and teacher feedback', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'announcements', name: 'Announcements', description: 'School announcements and new content', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'messages', name: 'Messages & Chat', description: 'Direct messages and chat replies', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'notice', name: 'Notices', description: 'Published notices and circulars', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'timetable', name: 'Timetable', description: 'Timetable and schedule changes', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'mindmaps', name: 'Mind Maps', description: 'Mind map shares and updates', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'ocr', name: 'OCR Scans', description: 'OCR scan progress and results', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'adaptive', name: 'Adaptive Learning', description: 'Personalized learning paths and review reminders', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'ai', name: 'AI Tutor', description: 'AI tutor replies and recommendations', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'skill', name: 'Skills & Rewards', description: 'Achievements, badges, coins and streaks', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'parent', name: 'Parent Updates', description: 'Updates shared with parents', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'teacher', name: 'Teacher', description: 'Teacher notifications', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'admin', name: 'Admin', description: 'Administrative alerts', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'fee', name: 'Fees & Payments', description: 'Fee reminders and payment confirmations', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'performance', name: 'Performance', description: 'Performance and progress updates', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'certificates', name: 'Certificates', description: 'Certificates issued', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'login', name: 'Account Activity', description: 'New sign-ins and account activity', importance: 4, sound: 'default', vibration: true, lights: true },
  { id: 'security', name: 'Security', description: 'Security alerts and warnings', importance: 5, sound: 'default', vibration: true, lights: true },
  { id: 'reports', name: 'Reports', description: 'Generated reports and weekly summaries', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'system', name: 'System', description: 'System and maintenance notices', importance: 3, sound: 'default', vibration: false, lights: true },
  { id: 'general', name: 'General', description: 'Other notifications', importance: 3, sound: 'default', vibration: false, lights: true },
];

let channelsEnsured = false;

/**
 * Create all notification channels on Android. Idempotent — re-creating an
 * existing channel updates it, so it is safe to call on every app start.
 */
export async function ensureNotificationChannels(): Promise<boolean> {
  if (channelsEnsured) return true;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let created = 0;
    for (const channel of NOTIFICATION_CHANNELS) {
      try {
        await PushNotifications.createChannel(channel);
        created += 1;
      } catch {
        // Channel may already exist with a locked config — not fatal.
      }
    }
    channelsEnsured = created > 0;
    return channelsEnsured;
  } catch {
    return false;
  }
}
