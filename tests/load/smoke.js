import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.05'],
    api_latency: ['p(95)<500'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  group('health endpoint', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    const ok = check(res, {
      'health status is 200': r => r.status === 200,
      'response body has status': r => r.json('status') !== undefined,
    });
    failureRate.add(!ok);
    apiLatency.add(res.timings.duration);
    sleep(1);
  });

  group('auth endpoints', () => {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'loadtest@school.edu',
      password: 'test-password',
    }), { headers: { 'Content-Type': 'application/json' } });
    const ok = check(res, {
      'auth returns 200 or 401': r => [200, 401].includes(r.status),
    });
    failureRate.add(!ok);
    apiLatency.add(res.timings.duration);
    sleep(2);
  });

  group('read endpoints', () => {
    const endpoints = [
      `${BASE_URL}/api/health`,
      `${BASE_URL}/api/health`,
      `${BASE_URL}/api/health`,
    ];
    const responses = http.batch(endpoints.map(url => ({ method: 'GET', url })));
    for (const res of responses) {
      const ok = check(res, { 'read endpoint ok': r => r.status === 200 });
      failureRate.add(!ok);
      apiLatency.add(res.timings.duration);
    }
    sleep(1);
  });
}
