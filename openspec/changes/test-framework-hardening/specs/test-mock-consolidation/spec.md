## ADDED Requirements

### Requirement: Supabase mock factory
The system SHALL provide a `createMockSupabase()` factory function in `src/__tests__/helpers/mock-factory.ts` that returns a mock object matching the `getSupabaseClient()` and `getSupabaseAdmin()` return type.

#### Scenario: createMockSupabase returns mock client
- **WHEN** `createMockSupabase()` is called
- **THEN** it SHALL return an object with a `.from(tableName)` method
- **THEN** `.from()` SHALL return a query builder chain supporting: `.select()`, `.eq()`, `.in()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.order()`, `.limit()`, `.single()`, `.maybeSingle()`, `.contains()`, `.filter()`, `.insert()`, `.update()`, `.delete()`, `.count()`

#### Scenario: Default mock returns empty data
- **WHEN** the default mock query chain resolves
- **THEN** `.select()` SHALL resolve to `{ data: [], error: null }`
- **THEN** `.single()` SHALL resolve to `{ data: null, error: null }`
- **THEN** `.insert()` SHALL resolve to `{ data: null, error: null }`
- **THEN** `.update()` SHALL resolve to `{ data: null, error: null }`

#### Scenario: Mock supports custom overrides
- **WHEN** a test calls `.mockReturnValue()` on any chain method
- **THEN** the chain SHALL use the custom return value instead of default

### Requirement: Logger mock factory
The system SHALL provide a `createMockLogger()` factory that returns a logger with `info`, `warn`, `error`, `debug` mock functions.

#### Scenario: Logger methods are jest fns
- **WHEN** `createMockLogger()` is called
- **THEN** all 4 methods (`info`, `warn`, `error`, `debug`) SHALL be `jest.fn()` instances that return `undefined`
