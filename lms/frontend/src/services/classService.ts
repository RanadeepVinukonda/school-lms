import api from './api';
import { useAuthStore } from '@/store/authStore';
import { getChildren } from './parentService';
import { hasAnyRole, hasRole } from '@/lib/roleHelpers';

export interface ClassLike {
  id: string;
  name?: string;
  code?: string;
  grade?: string;
  section?: string;
}

export interface ClassInfo extends ClassLike {
  academic_year?: string;
  [key: string]: unknown;
}

function normalizeClassRow(row: Record<string, unknown>): ClassInfo {
  const id = (row.id as string) || (row.classId as string) || '';
  const name = (row.name as string) || (row.className as string) || '';
  return {
    id,
    name,
    code: (row.code as string) || '',
    grade: (row.grade as string) || '',
    section: (row.section as string) || '',
    academic_year: (row.academic_year as string) || (row.academicYear as string) || '',
    ...row,
  };
}

/**
 * Standard display format for a class option:
 *   "Grade 1 - A", "Grade 2 - B", "Grade 5 - Section C"
 */
export function formatClassName(cls: ClassLike | null | undefined): string {
  if (!cls) return '';
  const grade = String(cls.grade || '').trim();
  const section = String(cls.section || '').trim();
  const name = String(cls.name || '').trim();

  if (grade) {
    const gradePart = /^grade\b/i.test(grade) ? grade : `Grade ${grade}`;
    return section ? `${gradePart} - ${section}` : gradePart;
  }
  if (name) return name;
  return cls.code || cls.id || '';
}

/**
 * Temporary debug logging for the class dropdown investigation.
 * Logged-in user id, user role, API response, filtered count, final options.
 */
function debugLog(...args: unknown[]): void {
  console.debug('[ClassService]', ...args);
}

/** Resolve the class ids a student / parent fallback path should consider. */
function idsFromUser(user: any): string[] {
  const ids = new Set<string>();
  if (user?.classId) ids.add(user.classId);
  for (const id of user?.classIds || []) if (id) ids.add(id);
  return Array.from(ids);
}

/** Fallback role-aware resolution used when GET /classes/my is unavailable. */
export async function getClassesForCurrentUserFallback(): Promise<ClassInfo[]> {
  const user = useAuthStore.getState().user;
  const role = user?.role || 'student';

  if (hasAnyRole(role, ['admin', 'teacher'])) {
    const res = await api.get('/classes');
    const payload = res.data?.data;
    const items = Array.isArray(payload) ? payload : payload?.data?.items || payload?.items || [];
    return (Array.isArray(items) ? items : []).map(normalizeClassRow);
  }

  if (hasRole(role, 'parent')) {
    const children = await getChildren();
    const seen = new Map<string, ClassInfo>();
    for (const child of children || []) {
      const classId = child.class_id || child.classIds?.[0];
      if (!classId) continue;
      const info = normalizeClassRow({ id: classId, ...(child.classInfo || {}) });
      if (info.name) {
        if (!seen.has(classId)) seen.set(classId, info);
      } else {
        if (!seen.has(classId)) seen.set(classId, { ...info, name: classId });
      }
    }
    return Array.from(seen.values());
  }

  const ids = idsFromUser(user);
  const own: ClassInfo[] = [];
  for (const cid of ids) {
    try {
      const res = await api.get(`/classes/${cid}`);
      const cls = res.data?.data;
      if (cls?.id) own.push(normalizeClassRow(cls));
    } catch {
      own.push({ id: cid, name: cid });
    }
  }
  return own;
}

/**
 * Centralized, role-aware class fetching for the currently logged-in user.
 * Primary source: GET /classes/my (backend applies role-based filtering).
 * Falls back to client-side role logic if the endpoint is unavailable.
 */
export async function getClassesForCurrentUser(): Promise<ClassInfo[]> {
  const user = useAuthStore.getState().user;
  const role = user?.role || 'student';

  debugLog('userId:', user?.id, '| role:', role);

  try {
    const res = await api.get('/classes/my');
    const payload = res.data?.data;
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    const classes = (items as Record<string, unknown>[]).map(normalizeClassRow);
    debugLog('API response classes:', classes.length, classes.map((c) => formatClassName(c)));
    return classes;
  } catch (err) {
    debugLog('GET /classes/my failed, using fallback:', err instanceof Error ? err.message : String(err));
  }

  const fallback = await getClassesForCurrentUserFallback();
  debugLog('Fallback classes:', fallback.length, fallback.map((c) => formatClassName(c)));
  return fallback;
}
