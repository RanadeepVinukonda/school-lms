## Why

This change addresses three critical system usability and data integrity issues:
1. **Foreign Key Deletion Blocks**: Deleting or archiving teachers and students in Supabase/PostgreSQL is currently blocked by several strict foreign key constraints (e.g., `textbooks_teacher_id_fkey`, `fee_payments_student_id_fkey`, `concept_mastery_student_id_fkey`).
2. **Notice Board Section Ambiguity**: In the admin panel, classes with multiple sections are displayed under a single generic class name, making it impossible to distinguish between sections (like Grade 10-A vs. Grade 10-B) when targeting announcements.
3. **Language Switching Sync Failures**: When a logged-in user changes their language, the preference switcher updates only the local language state but is overridden by the persistent database language setting, rendering language changes ineffective.

## What Changes

- **Database Constraint Hardening**: Update foreign key constraints across user-related tables (junctions, records, history, logs, metadata) to use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate.
- **Section Categorization on Notices**: Update the Notice Board class selector to display both the class grade and section (e.g., "Grade 10 - Section A").
- **Language Switcher Synchronization**: Modify the frontend language switcher to update the logged-in user state in `useAuthStore` and persist the preference in the database using the translation service.

## Capabilities

### New Capabilities
- `i18n-switcher-sync`: Synchronize and persist language changes for logged-in and guest users seamlessly across components, stores, and backend database profile preferences.

### Modified Capabilities
- `database-consolidation`: Introduce cascade delete and nullify behaviors on all foreign keys referencing `users(id)` and `concepts(id)` to prevent reference errors during record deletion.
- `school-erp`: Enhance notice board target selectors to display and target class sections cleanly instead of generic class labels.

## Impact

- **Database**: 10+ tables will have their constraints modified to add cascade deletes.
- **Backend API**: The user deletion/archival flows will now succeed without throwing database constraint violations.
- **Frontend**: `AdminNoticeBoardPage.tsx` and `LanguageSwitcher.tsx` will be modified.
