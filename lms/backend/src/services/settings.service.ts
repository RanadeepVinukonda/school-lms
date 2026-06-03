import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const DEFAULT_SETTINGS = {
  schoolName: 'School LMS',
  schoolCode: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo: '',
  academicYear: new Date().getFullYear().toString(),
  semester: 'First Semester',
  gradingSystem: {
    type: 'percentage',
    scale: 100,
    passingGrade: '50',
  },
  attendanceSettings: {
    enableGeoFencing: false,
    gracePeriodMinutes: 15,
    autoMarkAbsentAfter: 30,
  },
  notificationPreferences: {
    email: true,
    push: true,
    sms: false,
    inApp: true,
  },
  securitySettings: {
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
    requireTwoFactor: false,
  },
  features: {},
};

export async function getSettings() {
  const settingsDoc = await collections.settings().doc('general').get();

  if (!settingsDoc.exists) {
    await collections.settings().doc('general').set(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...settingsDoc.data() };
}

export async function updateSettings(data: Record<string, unknown>) {
  const ref = collections.settings().doc('general');
  const existing = await ref.get();

  if (!existing.exists) {
    await ref.set({ ...DEFAULT_SETTINGS, ...data, updatedAt: new Date().toISOString() });
  } else {
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
  }

  const updated = await ref.get();
  logger.info('Settings updated');

  return updated.data();
}

export async function getSystemSettings() {
  const settings = await getSettings();

  return {
    schoolName: settings.schoolName,
    academicYear: settings.academicYear,
    semester: settings.semester,
    gradingSystem: settings.gradingSystem,
    attendanceSettings: settings.attendanceSettings,
    securitySettings: settings.securitySettings,
    features: settings.features,
  };
}

export async function updateSystemSettings(data: Record<string, unknown>) {
  const allowedKeys = [
    'academicYear',
    'semester',
    'gradingSystem',
    'attendanceSettings',
    'securitySettings',
    'features',
  ];

  const filteredData: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      filteredData[key] = data[key];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    throw new NotFoundError('No valid settings to update');
  }

  return updateSettings(filteredData);
}
