import request from 'supertest';
import app from '../../app';

jest.setTimeout(30_000);

describe('API Versioning Integration', () => {
  it('GET / returns running message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /csrf-token is disabled in test mode', async () => {
    const res = await request(app).get('/csrf-token');
    expect(res.status).toBe(404);
  });
});
