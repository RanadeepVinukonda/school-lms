import { Request } from 'express';

/** Request type that includes the optional authenticated user payload used by audit logging */
export type ReqWithUser = Request & { user?: { uid: string; role?: string; displayName?: string } };

/** Generic query parameters type – used to replace unsafe `any` casts on `req.query`. */
export type QueryParams = Record<string, unknown>;
