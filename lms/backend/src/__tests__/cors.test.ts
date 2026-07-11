import { describe, it, expect, jest } from '@jest/globals';
import { corsOptions } from '../config/cors';

/**
 * CORS configuration tests.
 * Verifies that disallowed origins are blocked and allowed origins pass.
 */
describe('CORS configuration', () => {
  it('blocks disallowed origins in production', async () => {
    // Temporarily set NODE_ENV to production for this test
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';

    // Re-import to pick up production env
    jest.resetModules();
    const { corsOptions: prodCors } = await import('../config/cors');

    const result = await new Promise<boolean>((resolve) => {
      prodCors.origin!('https://evil-site.com', (err: Error | null, allowed?: boolean | string) => {
        resolve(err !== null || allowed === false);
      });
    });

    expect(result).toBe(true);
    process.env.NODE_ENV = origEnv;
  });

  it('allows allowed origins in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';

    jest.resetModules();
    const { corsOptions: prodCors } = await import('../config/cors');

    const result = await new Promise<boolean>((resolve) => {
      prodCors.origin!('https://app.school-lms.com', (err: Error | null, allowed?: boolean | string) => {
        resolve(err === null && allowed === true);
      });
    });

    expect(result).toBe(true);
    process.env.NODE_ENV = origEnv;
  });

  it('allows localhost in development', async () => {
    const result = await new Promise<boolean>((resolve) => {
      corsOptions.origin!('http://localhost:5173', (err: Error | null, allowed?: boolean | string) => {
        resolve(err === null && (allowed === true || allowed === undefined));
      });
    });

    expect(result).toBe(true);
  });

  it('allows requests without origin (server-to-server)', async () => {
    const result = await new Promise<boolean>((resolve) => {
      corsOptions.origin!(undefined, (err: Error | null, allowed?: boolean | string) => {
        resolve(err === null);
      });
    });

    expect(result).toBe(true);
  });
});
