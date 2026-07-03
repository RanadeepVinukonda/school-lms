## 1. Database Migrations

- [x] 1.1 Create SQL migration file `019_cascade_deletes_and_fixes.sql` in `lms/backend/supabase/migrations`
- [x] 1.2 Run database migrations using the migrations script
- [x] 1.3 Update base `schema.sql` references to use cascade deletes where appropriate

## 2. Notice Board Section Categorization

- [x] 2.1 Update class selection options in `AdminNoticeBoardPage.tsx` to suffix sections if present
- [x] 2.2 Update class display badges in `AdminNoticeBoardPage.tsx` to suffix sections if present

## 3. Language Selection Switcher Sync

- [x] 3.1 Modify `LanguageSwitcher.tsx` to use the `changeLanguage` function from the `useTranslation` hook
