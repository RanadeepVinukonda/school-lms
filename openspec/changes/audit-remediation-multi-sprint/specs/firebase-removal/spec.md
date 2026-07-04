## ADDED Requirements

### Requirement: Firestore batch operations removed
All uses of `batch.write()`, `batch.create()`, `batch.set()`, `batch.update()`, `batch.delete()` in backend services SHALL be replaced with Supabase adapter equivalents.

#### Scenario: No batch operations remain
- **WHEN** searching the codebase for `batch\.` and `firestore\.batch`
- **THEN** zero matches SHALL be found in service files

### Requirement: Firestore where() syntax replaced
All uses of Firestore's `where('field', '==', value)` syntax (e.g., in `lesson.service.ts`, `attendance.service.ts`, `analytics.service.ts`, `school-analytics.service.ts`) SHALL be replaced with Supabase's `.eq('field', value)` or the adapter's equivalent.

#### Scenario: No Firestore query syntax remains
- **WHEN** searching the codebase for `firestore.collection` or `where('` with Firestore comparison operators
- **THEN** zero matches SHALL be found in service files

### Requirement: Firestore collection references removed
All `collections.lessons().firestore.batch()` and similar patterns SHALL be replaced with adapter-based queries.

#### Scenario: Collection refs use adapter
- **WHEN** a service accesses a collection
- **THEN** it SHALL use the database adapter, not `firestore.collection()` or `.firestore.batch()`

## MODIFIED Requirements

### Requirement: Firebase adapter files are deleted
All files under `lms/backend/src/firebase/` SHALL be removed after their imports are migrated to `database/`. Additionally, all service files that imported these SHALL be verified clean.

#### Scenario: No firebase imports remain
- **WHEN** searching the codebase for `from '../firebase/'` or `from '../../firebase/'`
- **THEN** zero matches SHALL be found

### Requirement: Firebase security rules files are deleted
`lms/firestore.rules` and `lms/storage.rules` SHALL be removed.

#### Scenario: Rules files are gone
- **WHEN** listing files at `lms/firestore.rules` and `lms/storage.rules`
- **THEN** neither file SHALL exist

### Requirement: Firebase type declarations are deleted
`lms/backend/src/types/firebase-admin.d.ts` SHALL be removed.

#### Scenario: Firebase types file is removed
- **WHEN** checking `lms/backend/src/types/firebase-admin.d.ts`
- **THEN** the file SHALL NOT exist
