import { Request, Response, NextFunction } from 'express';

export function cacheControlMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (req.user) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    }
  }
  next();
}
