import { Request } from 'express';

/** Authenticated user shape after auth middleware runs */
export interface AuthUser {
  uid: string;
  role?: string;
  displayName?: string;
  school_id?: string;
}

/** Request type that includes the optional authenticated user payload used by audit logging */
export type ReqWithUser = Request & { user?: AuthUser };

/** Generic query parameters type – used to replace unsafe `any` casts on `req.query`. */
export type QueryParams = Record<string, unknown>;

/** Extract authenticated user from request, or throw 401 */
export function requireUser(req: Request): AuthUser {
  const user = (req as ReqWithUser).user;
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
