## Context

Background:
The LMS platform utilizes Supabase/PostgreSQL as the database and a React frontend. Deleting users (teachers or students) fails because multiple relational tables referencing them do not define cascading delete/nullification behaviors. Additionally, notice board targeting only shows grade level (not sections) and language changes are overridden by the user profile in the database.

## Goals / Non-Goals

**Goals:**
- Implement robust `ON DELETE CASCADE` and `ON DELETE SET NULL` constraints in a new database migration file.
- Disambiguate class selections in the notice board creation form by displaying sections alongside class names.
- Fix the language switcher by ensuring it calls `changeLanguage` to synchronize the state across the language store, auth store, and Supabase database.

**Non-Goals:**
- Re-translating static content or extending the translation dictionary.
- Changing logical authorization rules beyond fixing database cascades.

## Decisions

### Decision 1: DB Migration for Constraint Hardening
- **Approach**: Create `lms/backend/supabase/migrations/019_cascade_deletes_and_fixes.sql` to drop strict foreign key constraints and re-add them with `ON DELETE CASCADE` (for dependent items like enrollments, payments, textbooks) or `ON DELETE SET NULL` (for user-optional references like created_by).
- **Alternative**: Manually editing schema.sql without a migration. This is rejected because existing databases would not receive the updates.

### Decision 2: Class Section Categorization in Select Dropdowns
- **Approach**: Update `AdminNoticeBoardPage.tsx` select dropdown options to format class labels as `{cls.name}{cls.section ? ` - Section ${cls.section}` : ''}`.
- **Alternative**: Grouping options with `<optgroup>`, but simple suffix format is cleaner and more robust for simple select inputs.

### Decision Decision 3: Use Hook's `changeLanguage` instead of `setLanguage`
- **Approach**: Replace the direct store invocation `setLanguage(val)` in `LanguageSwitcher.tsx` with `changeLanguage(val)` from the `useTranslation` hook.
- **Alternative**: Modify the store subscriber, but using the hook is the designed way to update both user state and database.

## Risks / Trade-offs

- **[Risk] Data Loss on User Deletion** → Deleting a user will permanently delete their textbooks, enrollments, and payment history.
  - *Mitigation*: Ensure user deletion is only triggered by authorized admins, and prefer soft-deletion or disabling accounts (`is_active = false`) for retention.
- **[Risk] Migration Run Failures** → If a constraint name does not exist, the migration might fail.
  - *Mitigation*: Use `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` before adding the new constraint.
