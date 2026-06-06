import type { VercelRequest, VercelResponse } from '@vercel/node';

type HandlerFn = (req: VercelRequest, res: VercelResponse) => void;

let handler: HandlerFn;

try {
  handler = require('../backend/dist/app').default;
} catch (e: unknown) {
  handler = function (req: VercelRequest, res: VercelResponse) {
    const err = e instanceof Error ? e : new Error(String(e));
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
