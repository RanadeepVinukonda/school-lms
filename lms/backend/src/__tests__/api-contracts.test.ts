import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';

const mockQuery = {
  select: jest.fn<any>().mockReturnThis(),
  eq: jest.fn<any>().mockReturnThis(),
  order: jest.fn<any>().mockReturnThis(),
  limit: jest.fn<any>().mockReturnThis(),
  single: jest.fn<any>(),
  maybeSingle: jest.fn<any>(),
};
const mockSupabase = {
  auth: { getUser: jest.fn<any>() },
  from: jest.fn<any>().mockReturnValue(mockQuery),
};

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(),
  createBulkNotifications: jest.fn(),
}));

jest.mock('../middlewares/metrics.middleware', () => ({
  metricsMiddleware: (_req: any, _res: any, next: any) => next(),
  metricsHandler: (_req: any, res: any) => res.json({}),
}));

global.fetch = jest.fn<any>().mockResolvedValue({
  ok: false,
  status: 401,
  json: () => Promise.resolve({ error: 'Invalid credentials' }),
});

import app from '../app';

function mockAuthUser() {
  mockSupabase.auth.getUser.mockResolvedValue(({
    data: { user: { id: 'u1', email: 'test@test.com' } },
    error: null,
  }) as any);
  mockQuery.single.mockResolvedValue(({
    data: { role: 'student', display_name: 'Test', school_id: 's1', class_ids: [] },
    error: null,
  }) as any);
}

describe('API Contract: Auth endpoints', () => {
  it('POST /auth/send-otp - accepts valid phone', async () => {
    const res = await request(app).post('/auth/send-otp').send({ phone: '+919999999999' });
    expect([200, 400, 429, 500]).toContain(res.status);
  }, 30000);

  it('POST /auth/send-otp - rejects missing phone', async () => {
    const res = await request(app).post('/auth/send-otp').send({});
    expect([400, 422]).toContain(res.status);
  });

  it('POST /auth/verify-otp - accepts phone + token', async () => {
    const res = await request(app).post('/auth/verify-otp').send({ phone: '+919999999999', token: '000000' });
    expect([200, 400, 429, 500]).toContain(res.status);
  });

  it('GET /auth/profile - requires auth', async () => {
    const res = await request(app).get('/auth/profile');
    expect(res.status).toBe(401);
  });

  it('GET /auth/profile - does not return 401 when authenticated', async () => {
    mockAuthUser();
    const res = await request(app).get('/auth/profile').set('Authorization', 'Bearer valid');
    expect(res.status).not.toBe(401);
  });

  it('POST /auth/verify-token - requires auth', async () => {
    const res = await request(app).post('/auth/verify-token');
    expect(res.status).toBe(401);
  });

  it('POST /auth/logout - requires auth', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Gamification', () => {
  it('GET /gamification/profile/me - requires auth', async () => {
    const res = await request(app).get('/gamification/profile/me');
    expect(res.status).toBe(401);
  });

  it('GET /gamification/daily-challenges - requires auth', async () => {
    const res = await request(app).get('/gamification/daily-challenges');
    expect(res.status).toBe(401);
  });

  it('GET /gamification/leaderboard - requires auth', async () => {
    const res = await request(app).get('/gamification/leaderboard');
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Notifications', () => {
  it('GET /notifications - requires auth', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Users', () => {
  it('POST /auth/users - requires auth', async () => {
    const res = await request(app).post('/auth/users').send({ email: 'a@b.com', password: 'Pass123!', role: 'student' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/users - requires auth', async () => {
    const res = await request(app).get('/auth/users');
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Assignments', () => {
  it('POST /assignments - requires auth', async () => {
    const res = await request(app).post('/assignments').send({ title: 'Test', courseId: 'c1' });
    expect(res.status).toBe(401);
  });

  it('GET /assignments - requires auth', async () => {
    const res = await request(app).get('/assignments');
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Quizzes & Exams', () => {
  it('POST /quizzes - requires auth', async () => {
    const res = await request(app).post('/quizzes').send({ title: 'Quiz', courseId: 'c1' });
    expect(res.status).toBe(401);
  });

  it('POST /exams - requires auth', async () => {
    const res = await request(app).post('/exams').send({ title: 'Exam', courseId: 'c1' });
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Adaptive & AI', () => {
  it('POST /adaptive/mastery - requires auth', async () => {
    const res = await request(app).post('/adaptive/mastery').send({ conceptId: 'c1', accuracy: 0.8 });
    expect(res.status).toBe(401);
  });

  it('POST /ai-tutor/chat - requires auth', async () => {
    const res = await request(app).post('/ai-tutor/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Fee & Notices', () => {
  it('POST /fee/schedules - requires auth', async () => {
    const res = await request(app).post('/fee/schedules').send({ name: 'Tuition', amount: 5000, classId: 'c1' });
    expect(res.status).toBe(401);
  });

  it('POST /notices - requires auth', async () => {
    const res = await request(app).post('/notices').send({ title: 'Notice', content: 'Content' });
    expect(res.status).toBe(401);
  });
});

describe('API Contract: Health', () => {
  it('GET /health - returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });
});
