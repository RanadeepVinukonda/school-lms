## ADDED Requirements

### Requirement: Firebase Admin SDK usage is removed from auth service
The `auth.service.ts` SHALL NOT use Firebase Admin SDK for user registration. All auth operations SHALL use Supabase Auth APIs.

#### Scenario: Registration uses Supabase Auth
- **WHEN** a new user registers
- **THEN** `auth.service.ts.register()` SHALL call `supabase.auth.admin.createUser()`
- **THEN** no Firebase Admin `createUser` SHALL be called

### Requirement: Database/auth.ts Firebase functions are removed
The Firebase-specific auth functions in `database/auth.ts` (`createUser`, `getUserByEmail`, `revokeTokens`, etc.) SHALL be removed or replaced with Supabase Auth equivalents.

#### Scenario: Auth functions use Supabase
- **WHEN** `getUserByEmail` is called
- **THEN** it SHALL query Supabase Auth directly, not Firebase
- **WHEN** `revokeTokens` is called
- **THEN** it SHALL actually revoke sessions via Supabase Auth API (not be a no-op)
