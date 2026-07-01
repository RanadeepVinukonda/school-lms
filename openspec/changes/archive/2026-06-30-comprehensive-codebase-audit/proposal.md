## Why

The codebase was migrated from Firebase to Supabase but left in a half-migrated state with two parallel database adapters writing to different tables, pseudo-transactions with no ACID guarantees, widespread `as any` type erosion, in-memory filtering that won't scale, and ~80% of backend services untested. This creates data integrity risk, maintenance burden, and production failure points.

Beyond these issues, the codebase violates all five SOLID principles:
- **S**: The monolithic adapter handles query building, transactions, and connection management; services mix business logic with data filtering
- **O**: No interfaces to extend — changing storage requires modifying concrete classes
- **L**: `firebase/` and `database/` adapters aren't interchangeable (different tables = different behavior)
- **I**: `any`-typed `DocumentReference` exposes every consumer to the full surface area
- **D**: 50+ services import concrete adapter paths instead of abstractions, making testing and swapping impossible

## What Changes

1. Consolidate the two duplicate database adapters (`firebase/` and `database/`) into a single adapter with proper Supabase-native SQL operations
2. Replace pseudo-transactions with real PostgreSQL ACID transactions using `BEGIN`/`COMMIT`/`ROLLBACK`
3. Eliminate `as any` patterns across all services with proper typed interfaces
4. Replace in-memory filtering/pagination with database-level queries
5. Fix silently swallowed errors and add proper error propagation
6. Remove orphaned Firebase config files and security rules
7. Add comprehensive backend test coverage for all service endpoints
8. Fix Firebase type leaks in new adapter consumers
9. Refactor the entire backend to follow SOLID design principles — extract interfaces, invert dependencies, split monolithic classes, make every module testable through abstraction

## Capabilities

### New Capabilities
- `database-consolidation`: Single unified Supabase adapter replacing dual firebase/database adapters
- `acid-transactions`: PostgreSQL-native ACID transactions replacing pseudo-transactions
- `type-safety-audit`: Remove all `as any` casts; introduce proper typed interfaces across the DB layer and services
- `db-level-filtering`: Replace in-memory filtering with database-level queries and pagination
- `error-handling-audit`: Fix swallowed errors, add consistent error propagation patterns
- `firebase-removal`: Remove orphaned Firebase config, rules, types and fully migrate to Supabase
- `solid-principles`: Enforce SOLID design — interfaces for every module, dependency injection, single-responsibility splits, Liskov-compliant types, segregated contracts
- `backend-test-suite`: Comprehensive test coverage for all backend services

### Modified Capabilities

None — no existing specs to modify.

## Impact

- `lms/backend/src/database/adapter.ts` and `lms/backend/src/firebase/firestore.ts`: Replaced by interface + implementation pair following DIP
- `lms/backend/src/database/`: New `interfaces/` directory with `DbAdapter`, `Transaction`, `Collection`, `AuthProvider` interfaces
- `lms/backend/src/firebase/*`: Entire directory removed after migration
- `lms/backend/src/services/*.ts`: All services refactored to depend on interfaces, not concrete adapters
- `lms/backend/src/controllers/*.ts`: Error handling cleanup
- `lms/backend/src/types/firebase-admin.d.ts`: Removed and replaced with proper Supabase types
- `lms/backend/src/middlewares/auth.middleware.ts`: Error handling fix
- `lms/firestore.rules`, `lms/storage.rules`: Removed (unused Firebase rules)
- `lms/backend/src/__tests__/`: Expanded with comprehensive test suite using mocked interfaces
