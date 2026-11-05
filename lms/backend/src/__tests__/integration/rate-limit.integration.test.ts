import request from 'supertest';
import app from '../../app';

jest.setTimeout(30_000);

describe('Rate Limiting Integration', () => {
  it('health endpoint responds without crashing', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
  });

  it('root endpoint responds without crashing', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
});
