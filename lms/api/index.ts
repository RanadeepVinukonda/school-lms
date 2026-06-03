let handler: any;

try {
  handler = require('../backend/dist/app').default;
} catch (e: any) {
  handler = function (req: any, res: any) {
    res.statusCode = e?.message?.includes('environment') ? 500 : 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server initialization failed',
      message: e?.message || String(e),
      hint: e?.message?.includes('FIREBASE_PRIVATE_KEY')
        ? 'Check FIREBASE_PRIVATE_KEY format in Vercel env vars'
        : undefined,
    }));
  };
}

export default handler;
