import request from 'supertest';
import app from '../../app';

describe('Health Check Integration', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /health/deep returns status with checks', async () => {
    const res = await request(app).get('/health/deep');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checks');
  });
});
