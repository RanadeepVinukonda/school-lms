import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({
        data: {
          id: 'config-1',
          school_id: 'school-1',
          auth_token_url: 'https://moodle.com/oauth2/token'
        },
        error: null
      }),
      insert: () => chain,
      update: () => chain,
      single: () => Promise.resolve({ data: { id: 'config-1' }, error: null }),
    };
    return { from: jest.fn(() => chain) };
  }),
}));

import * as ltiService from '../services/lti.service';

describe('LTI 1.3 Service', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'moodle-access-token'
        }),
      } as Response)
    ) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should save LTI configuration', async () => {
    const res = await ltiService.saveLtiConfig('school-1', {
      issuer: 'https://moodle.com',
      client_id: 'client-1',
      deployment_id: 'deploy-1',
      auth_token_url: 'https://moodle.com/oauth2/token',
      auth_login_url: 'https://moodle.com/oauth2/login',
      jwks_url: 'https://moodle.com/jwks'
    });
    expect(res).toBeDefined();
  });

  it('should get LTI configuration', async () => {
    const res = await ltiService.getLtiConfig('school-1');
    expect(res).toBeDefined();
    expect(res?.school_id).toBe('school-1');
  });

  it('should handle LTI launch request', async () => {
    // Generate valid base64 payload JWT segment
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      iss: 'https://moodle.com',
      sub: 'user-1',
      email: 'teacher@moodle.com',
      name: 'Moodle Teacher',
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
      ]
    })).toString('base64');
    const signature = 'sig';
    const mockToken = `${header}.${payload}.${signature}`;

    const res = await ltiService.handleLtiLaunch(mockToken);
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
  });

  it('should passback grade to Moodle platform endpoint', async () => {
    const res = await ltiService.passbackGrade('school-1', 'https://moodle.com/ags/lineitem/1', 'user-1', 9, 10);
    expect(res.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
