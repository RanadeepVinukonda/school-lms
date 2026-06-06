import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../firebase/auth';
import { UnauthorizedError } from '../utils/errors';

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

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
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

    if (!decoded.role) {
      throw new UnauthorizedError('User has no role assigned');
    }
    req.user = {
      ...decoded,
      uid: decoded.uid,
      email: decoded.email || '',
      role: decoded.role as string,
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
