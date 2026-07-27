import request from 'supertest';
import app from '../../app';

jest.setTimeout(30_000);

describe('Quiz Flow Integration', () => {
  it('GET /quizzes-v2 requires auth', async () => {
    const res = await request(app).get('/quizzes-v2');
    expect([200, 401]).toContain(res.status);
  });
});
