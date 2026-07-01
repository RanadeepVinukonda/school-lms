## ADDED Requirements

### Requirement: No `as any` casts in database adapter or services
All TypeScript files in `lms/backend/src/` SHALL have zero `as any` casts. Generated Supabase types or explicit typed interfaces SHALL be used instead.

#### Scenario: TypeScript compilation passes without `as any`
- **WHEN** running `npx tsc --noEmit` on the backend
- **THEN** no errors related to implicit `any` SHALL be reported
- **THEN** no `as any` casts SHALL remain in compiled files

#### Scenario: Firebase type declarations are removed
- **WHEN** `types/firebase-admin.d.ts` is removed
- **THEN** all files that imported `FirebaseFirestore.DocumentReference` or similar types SHALL use a proper Supabase-typed equivalent
- **THEN** no file SHALL reference `FirebaseFirestore` types

### Requirement: Database types are generated from Supabase schema
The project SHALL include a `database.types.ts` generated from `supabase gen types typescript`.

#### Scenario: Types are regenerated after schema changes
- **WHEN** `schema.sql` or any migration changes the database schema
- **THEN** `database.types.ts` SHALL be regenerated
- **THEN** TypeScript compilation SHALL pass with the new types

### Requirement: Adapter returns typed results
All adapter methods (`get`, `set`, `update`, `add`, `list`) SHALL return properly typed results, not `any`.

#### Scenario: Service receives typed document
- **WHEN** a service calls `adapter.collection('users').doc(id).get()`
- **THEN** the result SHALL be typed as the expected document type
- **THEN** accessing non-existent properties SHALL produce a TypeScript error

### Requirement: Per-collection typed interfaces replace generic DocumentReference (ISP)
Each typed table in `TYPED_TABLES` SHALL have a dedicated TypeScript interface that exposes only the methods and types relevant to that collection. No consumer SHALL use a generic `DocumentReference` or `any`-typed collection handle.

#### Scenario: UserCollection has user-specific methods
- **WHEN** `user.service.ts` queries users
- **THEN** it SHALL use `UserCollection` interface with methods like `findByRole(role)`, not a generic `collection('users')`
- **THEN** the return type SHALL be `Promise<User | null>` or `Promise<User[]>`, not `Promise<any>`

#### Scenario: Narrow interface prevents misuse
- **WHEN** a developer accesses a `UserCollection` instance
- **THEN** grade, notification, and authentication methods SHALL NOT be accessible on it
- **THEN** the TypeScript compiler SHALL enforce this boundary
