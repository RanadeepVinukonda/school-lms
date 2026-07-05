// @ts-nocheck
import { IncomingMessage, ServerResponse } from 'http';

type HandlerFn = (req: IncomingMessage, res: ServerResponse) => void;

let handler: HandlerFn;

try {
  const app = require('../backend/dist/app').default;
  handler = (req: IncomingMessage, res: ServerResponse) => {
    app(req, res);
  };
} catch (e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  handler = function (req: IncomingMessage, res: ServerResponse) {
    if (req.url === '/api/health' || req.url === '/api') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.statusCode = err.message.includes('environment') ? 500 : 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server initialization failed',
      message: err.message,
      hint: err.message.includes('FIREBASE_PRIVATE_KEY')
        ? 'Check FIREBASE_PRIVATE_KEY format in Vercel env vars'
        : undefined,
    }));
  };
}

export default handler;
