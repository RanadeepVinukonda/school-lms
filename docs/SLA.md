# SLA — Service Level Agreement

## Uptime Target

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly uptime | 99.9% | ≤ 43 minutes downtime/month |
| Quarterly uptime | 99.95% | ≤ 21 minutes downtime/quarter |

## API Response Times

| Endpoint Category | Target (p95) | Target (p99) |
|------------------|-------------|-------------|
| Read endpoints (list, get) | < 500ms | < 1s |
| Write endpoints (create, update) | < 2s | < 4s |
| AI/OCR pipeline | < 10s | < 20s |
| Authentication | < 1s | < 2s |

## Support Response Times

| Severity | Response Time | Resolution Time |
|----------|--------------|----------------|
| Critical (SEV-1) | < 15 minutes | < 2 hours |
| High (SEV-2) | < 1 hour | < 8 hours |
| Medium (SEV-3) | < 4 hours | < 48 hours |
| Low (SEV-4) | < 24 hours | Next release |

## Exclusions

- Scheduled maintenance (notified 7 days in advance)
- Force majeure events
- Third-party provider outages (AI APIs, Cloudinary, Supabase)
- Client-side network issues

## Monitoring

- Uptime verified by external monitoring (3 geographic regions, 1-minute intervals)
- API response times tracked via Prometheus + Grafana
- SLA breaches automatically flagged and escalated
- Monthly SLA report published to stakeholders
