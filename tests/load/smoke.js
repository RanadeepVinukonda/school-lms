import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Scenarios ───────────────────────────────────────────────

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
  scenarios: {
    // 1. Login flow — 100 concurrent users
    login: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 100,
      stages: [
        { target: 20, duration: '30s' },  // ramp up
        { target: 50, duration: '1m' },   // sustain
        { target: 0, duration: '30s' },   // ramp down
      ],
      exec: 'loginFlow',
    },
    // 2. Concurrent exam submissions — 50 concurrent
    examSubmit: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { target: 10, duration: '30s' },
        { target: 25, duration: '1m' },
        { target: 0, duration: '30s' },
      ],
      exec: 'examSubmitFlow',
    },
    // 3. AI tutor queries — 20 concurrent streaming
    aiTutor: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'aiTutorFlow',
    },
    // 4. Textbook pipeline — 10 concurrent uploads
    textbookPipeline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      exec: 'textbookPipelineFlow',
    },
  },
};

// ── Custom metrics ──────────────────────────────────────────

const loginDuration = new Trend('login_duration_ms');
const examSubmitDuration = new Trend('exam_submit_duration_ms');
const aiQueryDuration = new Trend('ai_query_duration_ms');
const errorRate = new Rate('error_rate');

// ── Base URL ────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// ── Helpers ─────────────────────────────────────────────────

function getAuthToken() {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: __ENV.TEST_EMAIL || 'test@school.edu',
    password: __ENV.TEST_PASSWORD || 'test',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) {
    errorRate.add(1);
    return null;
  }
  loginDuration.add(res.timings.duration);
  return res.json().data?.session?.access_token || null;
}

// ── Flows ───────────────────────────────────────────────────

export function loginFlow() {
  const token = getAuthToken();
  check(token, { 'login succeeded': (t) => t !== null });

  if (token) {
    // Fetch dashboard data
    const dashboard = http.get(`${BASE_URL}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(dashboard, { 'dashboard loaded': (r) => r.status === 200 });
  }
  sleep(1);
}

export function examSubmitFlow() {
  const token = getAuthToken();
  if (!token) return;

  const payload = {
    examId: __ENV.TEST_EXAM_ID || 'test-exam-id',
    answers: [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
      { questionId: 'q3', answer: 'C' },
    ],
  };

  const res = http.post(`${BASE_URL}/api/academics/exams/submit`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  examSubmitDuration.add(res.timings.duration);
  check(res, { 'exam submitted': (r) => r.status === 200 || r.status === 201 });
  errorRate.add(res.status >= 400 ? 1 : 0);
  sleep(2);
}

export function aiTutorFlow() {
  const token = getAuthToken();
  if (!token) return;

  const res = http.post(`${BASE_URL}/api/ai/tutor/query`, JSON.stringify({
    query: 'Explain the concept of photosynthesis in simple terms.',
    context: { subject: 'Science', grade: 8 },
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  aiQueryDuration.add(res.timings.duration);
  check(res, { 'AI query responded': (r) => r.status === 200 });
  errorRate.add(res.status >= 400 ? 1 : 0);
  sleep(3);
}

export function textbookPipelineFlow() {
  const token = getAuthToken();
  if (!token) return;

  // Simulate textbook upload pipeline
  const res = http.post(`${BASE_URL}/api/content/textbook/upload`, JSON.stringify({
    title: `Load Test Textbook ${Date.now()}`,
    subjectId: __ENV.TEST_SUBJECT_ID || 'test-subject-id',
    classId: __ENV.TEST_CLASS_ID || 'test-class-id',
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  check(res, { 'pipeline started': (r) => r.status === 202 });
  errorRate.add(res.status >= 400 ? 1 : 0);
  sleep(5);
}
