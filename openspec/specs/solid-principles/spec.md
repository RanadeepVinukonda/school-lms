## ADDED Requirements

### Requirement: Every module depends on interfaces, not concretions (DIP)
All services, controllers, and middlewares SHALL receive their dependencies through constructor or parameter injection using TypeScript interfaces. No file in `services/`, `controllers/`, or `middlewares/` SHALL directly import a concrete database adapter, client, or connection pool.

#### Scenario: Service receives typed interface in constructor
- **WHEN** a service is instantiated
- **THEN** its dependencies SHALL be interface types, not concrete classes
- **THEN** the service SHALL NOT import `supabase-js`, `pg`, or any database client directly

#### Scenario: Test can inject mock implementation
- **WHEN** a service is tested
- **THEN** a mock implementation of its dependencies SHALL be injectable
- **THEN** the service SHALL behave identically with mock and real implementations

### Requirement: Database adapter has a stable interface (OCP)
The `DbAdapter` interface SHALL define the complete contract for data access. New storage implementations SHALL implement this interface without modifying existing consumers.

#### Scenario: Adding PostgreSQL-native implementation
- **WHEN** a new `PostgresDbAdapter` is added
- **THEN** it SHALL implement `DbAdapter`
- **THEN** existing services SHALL require zero changes to use it

#### Scenario: Adding in-memory test implementation
- **WHEN** an `InMemoryDbAdapter` is added for tests
- **THEN** it SHALL implement `DbAdapter`
- **THEN** all service tests SHALL pass against it

### Requirement: Adapter implementations are interchangeable (LSP)
Every implementation of `DbAdapter`, `Transaction`, `Collection`, and `AuthProvider` SHALL produce identical observable behaviour for the same inputs. A shared contract test suite SHALL validate this.

#### Scenario: Same query returns same result across implementations
- **WHEN** the same `findById` query is executed on `SupabaseUserCollection` and `InMemoryUserCollection`
- **THEN** both SHALL return structurally identical results for the same data

### Requirement: Each module has a single responsibility (SRP)
No class or module SHALL handle more than one distinct concern. The adapter SHALL be split into `ConnectionManager`, `QueryBuilder`, `TransactionManager`, and collection-specific classes.

#### Scenario: Adapter is split into focused modules
- **WHEN** inspecting `database/adapter.ts`
- **THEN** it SHALL NOT exceed 150 lines
- **THEN** connection lifecycle, query construction, and transaction handling SHALL live in separate files

#### Scenario: Services contain only business logic
- **WHEN** inspecting any service in `services/`
- **THEN** it SHALL NOT contain raw database queries, connection pool operations, or transaction begin/commit calls
- **THEN** those operations SHALL be delegated to injected interface dependencies

### Requirement: Consumers depend on narrow interfaces (ISP)
Instead of one generic `DocumentReference` typed as `any`, each collection SHALL have a dedicated interface exposing only the methods relevant to that collection.

#### Scenario: User operations go through UserCollection
- **WHEN** `user.service.ts` queries users
- **THEN** it SHALL call methods on `UserCollection` interface, not a generic `DocumentReference`
- **THEN** `UserCollection` SHALL NOT expose grade, notification, or other unrelated methods

#### Scenario: Grade operations go through GradeCollection
- **WHEN** `grade.service.ts` queries grades
- **THEN** it SHALL call methods on `GradeCollection` interface
- **THEN** `GradeCollection` SHALL NOT expose user authentication or notification methods
