# Test Best Practices Guide

This document outlines critical practices to follow when writing tests to ensure the CI pipeline never fails due to test configuration issues.

## 1. Mock Setup Rules

### ✅ DO: Mock Before Imports

**Always place jest.mock() calls BEFORE any imports**, especially when mocking database adapters, services, or utilities:

```typescript
// ✅ CORRECT
jest.mock('../database/adapter', () => ({
  collections: {
    users: jest.fn(() => mockCollection),
  },
}));

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
}));

// THEN import the services
import * as userService from '../services/user.service';
import app from '../app';
```

### ❌ DON'T: Import Before Mocking

```typescript
// ❌ WRONG - This will fail with "Cannot find module"
import app from '../app';

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
}));
```

## 2. Test File Structure Template

Use this structure for all test files to ensure consistency:

```typescript
// 1. Import test utilities
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// 2. Create mock objects
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn().mockReturnValue(mockQuery),
};

// 3. Set up ALL jest.mock() calls
jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// 4. NOW import what you need to test
import app from '../app';
import { someFunction } from '../services/some.service';

// 5. Write your tests
describe('Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // test body
  });
});
```

## 3. Mock Cleanup Between Tests

### Always reset mocks in beforeEach():

```typescript
describe('My Service Tests', () => {
  let mockCollection: any;

  function createMockCollection() {
    return {
      doc: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
      }),
      where: jest.fn().mockReturnThis(),
    };
  }

  beforeEach(() => {
    // ✅ Reset mock state before each test
    jest.clearAllMocks();
    mockCollection = createMockCollection();
  });

  afterEach(() => {
    // ✅ Clean up async operations
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should work correctly', () => {
    // test body
  });
});
```

## 4. Handle Async Test Operations

### Use proper async/await patterns:

```typescript
// ✅ CORRECT
it('should fetch data', async () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'u1' } },
    error: null,
  });

  const result = await authenticate(req, res, next);
  expect(result).toBeDefined();
});

// ✅ Also correct - for sync operations with async mocks
it('should handle auth', () => {
  authenticate(mockReq('Bearer token'), mockRes(), next);
  
  // Wait for nextTick to allow promises to resolve
  return new Promise(process.nextTick).then(() => {
    expect(next).toHaveBeenCalled();
  });
});

// ❌ WRONG - Don't forget to await
it('should fetch data', async () => {
  const result = authenticate(req, res, next);
  // This won't wait for the async operation!
});
```

## 5. Global Setup/Teardown

Add to jest.config.js if you have global setup needs:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // ... rest of config
};
```

Create `src/__tests__/setup.ts`:

```typescript
// Global mock setup that runs before all tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';

// Suppress console errors during tests if needed
global.console.error = jest.fn();
```

## 6. Mock Database Pattern

For Firestore/database mocks, use this pattern:

```typescript
function createMockCollection() {
  const mockDoc = {
    exists: true,
    id: 'mock-id',
    data: jest.fn().mockReturnValue({}),
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: jest.fn().mockReturnValue({}),
    }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  return {
    doc: jest.fn().mockReturnValue(mockDoc),
    collection: jest.fn().mockReturnValue(this),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: false,
      size: 1,
      docs: [mockDoc],
      forEach: jest.fn(),
    }),
    add: jest.fn().mockResolvedValue(mockDoc),
  };
}

jest.mock('../database/adapter', () => ({
  collections: {
    users: jest.fn(() => createMockCollection()),
    classes: jest.fn(() => createMockCollection()),
    subjects: jest.fn(() => createMockCollection()),
  },
}));
```

## 7. Environment Variables in Tests

### Mock environment variables properly:

```typescript
beforeEach(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
});

afterEach(() => {
  // Clean up environment variables
  delete process.env.NODE_ENV;
  delete process.env.SUPABASE_URL;
});
```

## 8. Testing Express Routes

### Proper pattern for testing app routes:

```typescript
import request from 'supertest';
import app from '../app';

describe('API Contracts', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body).toMatchObject({ success: true });
  });

  it('POST /auth/register requires body', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({});

    expect(res.status).toBe(400);
  });
});
```

## 9. Common Pitfalls to Avoid

| ❌ Problem | ✅ Solution |
|-----------|-----------|
| jest.mock() after imports | Move all jest.mock() to top of file |
| Forgetting to clear mocks | Add `jest.clearAllMocks()` in beforeEach() |
| Not awaiting async operations | Use async/await properly, return promises |
| Circular dependency issues | Check import order, mock before importing |
| Global state leaking between tests | Reset mocks and state in beforeEach() |
| Missing mock implementations | Ensure mocked functions return expected types |
| Forgetting to export from app.ts | Verify `export default app` exists |
| Timeouts in tests | Use `jest.useFakeTimers()` and `jest.runAllTimers()` |

## 10. Update Safety Checklist

When updating code in your repository, follow this checklist:

- [ ] All imports in app.ts are properly resolved
- [ ] All services export default or named exports used in tests
- [ ] jest.mock() calls appear at top of test files BEFORE imports
- [ ] beforeEach() has jest.clearAllMocks()
- [ ] Async operations are properly awaited
- [ ] Mocked objects return correct types
- [ ] Environment variables are set in beforeEach()
- [ ] No circular dependencies between modules
- [ ] Logger utility is properly mocked globally
- [ ] Database/API mocks include all used methods
- [ ] All relative paths in imports resolve correctly
- [ ] afterEach() cleans up timers and subscriptions

## 11. Running Tests Locally

Before pushing code, run tests locally:

```bash
cd lms/backend

# Run all tests
npm test

# Run specific test file
npm test -- src/__tests__/auth.middleware.test.ts

# Run with coverage
npm test -- --coverage

# Run with more verbose output
npm test -- --verbose

# Run with file watching (development)
npm test:watch
```

## 12. CI Configuration

The GitHub Actions workflow uses these flags to prevent hangs:

```yaml
- run: npm test -- --forceExit --detectOpenHandles --bail
```

- `--forceExit`: Forces Jest to exit after tests complete
- `--detectOpenHandles`: Reports which handles kept the process alive
- `--bail`: Stops at first failure for faster debugging

If you see "Force exiting Jest" in logs, check for:
- Unclosed database connections
- Unresolved promises in tests
- Open timers not cleared
- Event listeners not removed

## Resources

- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
- [ts-jest Configuration](https://kulshekhar.github.io/ts-jest/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
