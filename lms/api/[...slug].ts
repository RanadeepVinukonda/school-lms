import { IncomingMessage, ServerResponse } from 'http';

type HandlerFn = (req: IncomingMessage, res: ServerResponse) => void;

let handler: HandlerFn;
let initAttempted = false;

function getHandler(): HandlerFn {
  if (handler) return handler;

  if (!initAttempted) {
    initAttempted = true;
    try {
      // Lazy-load the Express app; must be compiled via `cd backend && npx tsc` first
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const app = require('../backend/dist/app').default;
      handler = (req: IncomingMessage, res: ServerResponse) => {
        app(req, res);
      };
      return handler;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      handler = createFallbackHandler(err);
      return handler;
    }
  }

  // Return a 503 until the app is ready (handles concurrent requests during init)
  handler = createFallbackHandler(new Error('Server still initializing'));
  return handler;
}

function createFallbackHandler(err: Error): HandlerFn {
  return function (req: IncomingMessage, res: ServerResponse) {
    // Health check always works even when backend fails to load
    if (req.url === '/api/health' || req.url === '/api') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', mode: 'fallback' }));
      return;
    }

    const isEnvIssue = err.message.includes('environment') || err.message.includes('SUPABASE');
    res.statusCode = isEnvIssue ? 500 : 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server initialization failed',
      message: err.message,
      hint: isEnvIssue
        ? 'Check that all required environment variables are set in Vercel dashboard'
        : undefined,
    }));
  };
}

export default function vercelHandler(req: IncomingMessage, res: ServerResponse): void {
  const activeHandler = getHandler();
  activeHandler(req, res);
}
