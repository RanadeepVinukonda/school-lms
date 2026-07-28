// ponytail: re-exports Supabase-backed Firebase adapter — all existing importers work unchanged
import {
  verifyToken as vt,
  createUser as cu,
  updateUser as uu,
  deleteUser as du,
  revokeTokens as rt,
  getUserByPhone as gubp,
  getUserById as gubi,
  listUsers as lu,
} from './auth';
import { getSupabaseAdmin } from '../services/supabase';

export {
  vt as verifyToken, cu as createUser, uu as updateUser, du as deleteUser,
  rt as revokeTokens, gubp as getUserByPhone, gubi as getUserById, lu as listUsers,
};
export type { AuthUser } from './auth';

// Legacy aliases for files that import getAdminFirestore / getAdminAuth directly
export function getAdminFirestore(): any { return getSupabaseAdmin(); }
export function getAdminAuth() {
  return {
    verifyIdToken: (token: string) => vt(token).then(u => ({ uid: u.uid, email: u.email, role: u.role })),
    createUser: (params: any) => cu({ ...params, displayName: params.displayName || '' }),
    updateUser: (uid: string, params: any) => uu(uid, params),
    deleteUser: (uid: string) => du(uid),
    getUser: (uid: string) => gubi(uid),
    getUserByPhone: (phone: string) => gubp(phone),
    listUsers: (maxResults?: number) => lu(maxResults),
    deleteUsers: async (uids: string[]) => {
      for (const uid of uids) {
        await du(uid);
      }
    },
  } as any;
}
// Legacy alias for scripts that import `admin` directly
export const admin = {
  firestore: () => ({
    recursiveDelete: async () => { throw new Error('use Supabase Storage/delete directly'); },
  }),
  auth: () => null,
} as any;


