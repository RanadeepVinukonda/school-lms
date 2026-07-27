import request from 'supertest';
import app from '../../app';

describe('Rate Limiting Integration', () => {
  it('auth endpoint returns rate limit headers', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'wrong' });
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('API endpoints return rate limit headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers).toHaveProperty('ratelimit-limit');
  });
});
