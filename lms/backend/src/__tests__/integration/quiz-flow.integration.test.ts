import request from 'supertest';
import app from '../../app';

describe('Quiz Flow Integration', () => {
  it('GET /quiz-v2 returns quizzes list', async () => {
    const res = await request(app).get('/quiz-v2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
  });
});
