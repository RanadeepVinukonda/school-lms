# Contributing to School LMS

## Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop (for local PostgreSQL)
- Git

### Local Development

```bash
git clone <repo-url>
cd school-lms

# Backend
cd lms/backend
cp .env.example .env  # edit as needed
npm install
npm run dev

# Frontend
cd lms/frontend
cp .env.example .env
npm install
npm run dev
```

### Running Tests

```bash
# Backend
cd lms/backend
npm test                 # Unit tests
npm test -- --coverage   # With coverage report
npm run test:watch       # Watch mode

# Frontend
cd lms/frontend
npm test
```

---

## Branch Naming

```
<type>/<issue-number>-<kebab-description>
```

Examples:
- `feat/123-add-fee-report-endpoint`
- `fix/456-fix-attendance-timezone`
- `refactor/789-extract-base-service`
- `docs/101-add-architecture-diagram`

### Types
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructuring (no behavior change)
- `test` — Adding/updating tests
- `docs` — Documentation
- `chore` — Build, CI, dependencies
- `perf` — Performance improvement
- `security` — Security fix

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Examples:
```
feat(fees): add outstanding report endpoint
fix(auth): handle expired token refresh gracefully
refactor(services): extract BaseService for CRUD operations
test(health): add deep health check edge case tests
docs(api): add OpenAPI annotations to fee routes
```

---

## Pull Request Process

### PR Checklist
- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Lint clean (`npm run lint`)
- [ ] Coverage maintained or improved
- [ ] OpenAPI annotations added for new/changed routes
- [ ] No hardcoded secrets or sensitive data
- [ ] Changelog updated (if applicable)

### Review Guidelines
- Every PR requires at least 1 approval
- Reviewers check: correctness, test coverage, security, performance, style consistency
- Address all review comments before merging
- Squash merge into `main` preferred

---

## Code Style

- TypeScript with strict mode
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Async/await preferred over raw promises
- Named exports preferred over default exports
- JSDoc comments for public API surfaces

### Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `fee-service.ts`)
- **Classes/PascalCase**: `BaseService`, `FeeService`
- **Functions**: `camelCase` (e.g., `recordPayment`)
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Database columns**: `snake_case` (e.g., `school_id`, `created_at`)

---

## Testing Guidelines

### Unit Tests
- Test one function/module in isolation
- Mock external dependencies (DB, AI, file system)
- Cover happy path + error cases
- Use `describe`/`it` blocks for organization

### Integration Tests
- Use ephemeral PostgreSQL (Docker Compose)
- Run migrations before suite, truncate between tests
- Test real DB interactions with Supabase

### E2E Tests
- Use Playwright for web, Detox for mobile
- Seed test data via API, not UI typing
- Capture screenshots on failure
- Test retry: 2 attempts

---

## Project Structure

```
lms/backend/src/
├── app.ts              # Express application setup
├── index.ts            # Entry point with graceful shutdown
├── config/             # Environment, CORS, logger, Swagger
├── controllers/        # Route handlers
├── database/           # Connection, migrations, schema, auth
├── jobs/               # Background jobs (Inngest, scheduler)
├── lib/                # Shared utilities (BaseService)
├── middlewares/        # Auth, error, rate-limit, security
├── routes/             # Express routers
├── services/           # Business logic
├── types/              # TypeScript definitions
└── utils/              # Helper functions
```

---

## Need Help?

- Check existing tests for usage examples
- Review the ARCHITECTURE.md for system design
- File an issue for feature requests or bugs
- Ask in the team channel for guidance
