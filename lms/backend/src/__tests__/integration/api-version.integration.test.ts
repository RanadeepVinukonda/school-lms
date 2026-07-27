import request from 'supertest';
import app from '../../app';

describe('API Versioning Integration', () => {
  it('GET / returns running message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /csrf-token returns token', async () => {
    const res = await request(app).get('/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
  });
});
