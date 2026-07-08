import { getSupabaseAdmin } from './supabase';
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
  conceptFlaggingThreshold: 50,
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

/** Get all settings. Initializes with defaults if the 'general' document doesn't exist. */
export async function getSettings() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'settings').eq('doc_id', 'general').maybeSingle();
  if (error) throw new Error('Failed to fetch settings: ' + error.message);

  if (!data) {
    const { error: insertError } = await supabase.from('firestore_docs').insert({
      collection: 'settings', doc_id: 'general', data: DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    });
    if (insertError) throw new Error(`Failed to initialize settings: ${insertError.message}`);
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...data.data as Record<string, unknown> };
}

/** Update settings by merging the given data with existing values. Creates the document if needed. */
export async function updateSettings(data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'settings').eq('doc_id', 'general').maybeSingle();
  if (fetchErr) throw new Error('Failed to fetch existing settings: ' + fetchErr.message);

  const now = new Date().toISOString();
  if (!existing) {
    const { error: insertError } = await supabase.from('firestore_docs').insert({
      collection: 'settings', doc_id: 'general',
      data: { ...DEFAULT_SETTINGS, ...data, updatedAt: now },
      updated_at: now,
    });
    if (insertError) throw new Error(`Failed to update settings: ${insertError.message}`);
  } else {
    const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: now };
    const { error: updateError } = await supabase.from('firestore_docs').update({ data: merged, updated_at: now })
      .eq('collection', 'settings').eq('doc_id', 'general');
    if (updateError) throw new Error(`Failed to update settings: ${updateError.message}`);
  }

  const { data: updated, error: updatedErr } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'settings').eq('doc_id', 'general').maybeSingle();
  if (updatedErr) throw new Error('Failed to fetch updated settings: ' + updatedErr.message);
  logger.info('Settings updated');

  return updated?.data as Record<string, unknown> | undefined;
}

/** Get system-level settings (academicYear, semester, grading, attendance, security, features). */
export async function getSystemSettings() {
  const settings = await getSettings();

  return {
    schoolName: settings.schoolName,
    academicYear: settings.academicYear,
    semester: settings.semester,
    conceptFlaggingThreshold: settings.conceptFlaggingThreshold,
    gradingSystem: settings.gradingSystem,
    attendanceSettings: settings.attendanceSettings,
    securitySettings: settings.securitySettings,
    features: settings.features,
  };
}

/** Update only system-level settings (whitelisted keys). Throws NotFoundError if no valid keys provided. */
export async function updateSystemSettings(data: Record<string, unknown>) {
  const allowedKeys = [
    'academicYear',
    'semester',
    'conceptFlaggingThreshold',
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
