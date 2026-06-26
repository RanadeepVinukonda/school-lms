// ponytail: re-exports Supabase-backed Firebase adapter — all existing importers work unchanged
import {
  verifyToken as vt,
  createUser as cu,
  updateUser as uu,
  deleteUser as du,
  setCustomClaims as scc,
  revokeTokens as rt,
  getUserByEmail as gube,
  getUserById as gubi,
  listUsers as lu,
} from './auth';
import { getDb as gdb } from './firestore';

export {
  vt as verifyToken, cu as createUser, uu as updateUser, du as deleteUser,
  scc as setCustomClaims, rt as revokeTokens, gube as getUserByEmail,
  gubi as getUserById, lu as listUsers,
};
export type { AuthUser } from './auth';

export { getDb, getCollection, collections, FieldValue } from './firestore';

// Legacy aliases for files that import getAdminFirestore / getAdminAuth directly
export function getAdminFirestore(): any { return gdb(); }
export function getAdminAuth() {
  return {
    verifyIdToken: (token: string) => vt(token).then(u => ({ uid: u.uid, email: u.email, role: u.role })),
    createUser: (params: any) => cu({ ...params, displayName: params.displayName || '' }),
    updateUser: (uid: string, params: any) => uu(uid, params),
    deleteUser: (uid: string) => du(uid),
    getUser: (uid: string) => gubi(uid),
    getUserByEmail: (email: string) => gube(email),
  } as any;
}
// Legacy alias for scripts that import `admin` directly
export const admin = {
  firestore: () => ({
    recursiveDelete: async () => { throw new Error('use Supabase Storage/delete directly'); },
  }),
  auth: () => null,
} as any;

export function getAdminStorage() {
  return {
    bucket: () => ({
      upload: () => { throw new Error('Storage: use Supabase Storage directly'); },
      file: () => ({ delete: () => { throw new Error('Storage: use Supabase Storage directly'); } }),
    }),
  } as any;
}
