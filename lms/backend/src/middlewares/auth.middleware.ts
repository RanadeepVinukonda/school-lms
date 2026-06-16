import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../firebase/auth';
import { getAdminFirestore } from '../firebase/admin';
import { UnauthorizedError } from '../utils/errors';
import { asyncHandler } from './asyncHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: string;
        name: string;
        [key: string]: unknown;
      };
    }
  }
}

/** Require a valid Firebase Auth token. Sets req.user with uid, email, role, and name. Falls back to Firestore for role if token lacks it. Throws UnauthorizedError if missing or invalid. */
async function _authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = await verifyToken(idToken);

    let role = decoded.role as string | undefined;
    if (!role) {
      try {
        const snap = await getAdminFirestore().doc(`users/${decoded.uid}`).get();
        if (snap.exists) {
          role = snap.data()?.role as string | undefined;
        }
      } catch {
        /* Firestore fallback not available */
      }
    }

    if (!role) {
      throw new UnauthorizedError('User has no assigned role');
    }

    req.user = {
      ...decoded,
      uid: decoded.uid,
      email: decoded.email || '',
      role,
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

export const authenticate = asyncHandler(_authenticate);

/** Optionally parse a Firebase Auth token if present. Does not throw on failure — req.user will remain undefined. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    next();
    return;
  }

  verifyToken(idToken)
    .then((decoded) => {
      req.user = {
        ...decoded,
        uid: decoded.uid,
        email: decoded.email || '',
        role: decoded.role as string,
        name: decoded.name || decoded.email?.split('@')[0] || 'User',
      };
      next();
    })
    .catch(() => {
      next();
    });
}
