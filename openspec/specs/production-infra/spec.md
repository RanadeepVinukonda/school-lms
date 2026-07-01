# Production Infrastructure

## Purpose
Provide a production-ready deployment with Docker containerisation, CI/CD pipelines, health monitoring, structured logging, database backups, and error tracking.

## Requirements

### Requirement: Application runs in Docker containers
Both backend and frontend SHALL have Dockerfiles that produce deterministic production builds. A `docker-compose.yml` SHALL orchestrate the full stack (backend, frontend, database, Redis) for local development.

#### Scenario: Docker Compose starts the full stack
- **WHEN** a developer runs `docker compose up`
- **THEN** all services SHALL start within 60 seconds
- **THEN** the application SHALL be accessible at `http://localhost:3000`
- **THEN** health checks SHALL pass for all services

### Requirement: CI/CD pipeline on every push
A GitHub Actions pipeline SHALL run on every push to `main` and on every pull request. The pipeline SHALL: install dependencies, run TypeScript compilation, run all tests, build Docker images, and deploy to staging on merge to `main`.

#### Scenario: Pipeline fails on test failure
- **WHEN** a pull request contains a failing test
- **THEN** the CI pipeline SHALL fail and block the merge
- **THEN** a summary of failed tests SHALL be posted as a PR comment

### Requirement: Health, readiness, and liveness endpoints
The backend SHALL expose `GET /health` (liveness), `GET /ready` (readiness), and `GET /metrics` (Prometheus-compatible metrics).

#### Scenario: Health endpoint returns service status
- **WHEN** `GET /health` is called
- **THEN** the response SHALL be `200 OK` with `{ "status": "healthy", "uptime": <seconds> }`
- **THEN** if the database is unreachable, the response SHALL be `503 Service Unavailable`

### Requirement: Structured logging with correlation IDs
Every log entry SHALL be JSON-formatted and include: `timestamp`, `level`, `message`, `requestId`, `userId`, `schoolId`, `service`. Log levels SHALL be configurable via environment variable.

#### Scenario: Request correlation is traceable
- **WHEN** a request enters the system
- **THEN** a unique `requestId` SHALL be generated and attached to all log entries for that request
- **THEN** the `requestId` SHALL be returned in the response as `X-Request-Id` header

### Requirement: Automated database backups
The database SHALL be backed up daily. Backups SHALL be retained for 30 days. A backup restoration SHALL be tested monthly.

#### Scenario: Backup is created daily
- **WHEN** the daily backup job runs at 02:00 UTC
- **THEN** a compressed database dump SHALL be stored in object storage
- **THEN** a backup success notification SHALL be sent to the platform admin
