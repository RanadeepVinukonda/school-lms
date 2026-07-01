## ADDED Requirements

### Requirement: Firebase adapter files are deleted
All files under `lms/backend/src/firebase/` SHALL be removed after their imports are migrated to `database/`.

#### Scenario: No firebase imports remain
- **WHEN** searching the codebase for `from '../firebase/'` or `from '../../firebase/'`
- **THEN** zero matches SHALL be found

### Requirement: Firebase security rules files are deleted
`lms/firestore.rules` and `lms/storage.rules` SHALL be removed as they are unused after the Supabase migration.

#### Scenario: Rules files are gone
- **WHEN** listing files at `lms/firestore.rules` and `lms/storage.rules`
- **THEN** neither file SHALL exist

### Requirement: Firebase type declarations are deleted
`lms/backend/src/types/firebase-admin.d.ts` SHALL be removed. Types SHALL be provided by generated Supabase types or explicit interfaces.

#### Scenario: Firebase types file is removed
- **WHEN** checking `lms/backend/src/types/firebase-admin.d.ts`
- **THEN** the file SHALL NOT exist
