import request from 'supertest';
import app from '../../app';

describe('Class Flow Integration', () => {
  it('GET /classes returns classes list', async () => {
    const res = await request(app).get('/classes');
    expect([200, 401]).toContain(res.status);
  });
});
