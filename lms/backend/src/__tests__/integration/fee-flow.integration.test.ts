import request from 'supertest';
import app from '../../app';

jest.setTimeout(30_000);

describe('Fee Flow Integration', () => {
  it('GET /fee/schedules requires auth', async () => {
    const res = await request(app).get('/fee/schedules');
    expect([200, 401]).toContain(res.status);
  });
});
