## ADDED Requirements

### Requirement: ReqWithUser type includes school_id
The `ReqWithUser` type in `types/common.ts` SHALL include the `school_id` field to match what `auth.middleware.ts` actually attaches to `req.user`.

#### Scenario: Course routes compile without type errors
- **WHEN** `course.routes.ts` accesses `req.user!.school_id`
- **THEN** TypeScript SHALL recognize `school_id` as a valid field
- **THEN** no `// @ts-ignore` or type assertion SHALL be needed

### Requirement: Mobile navigation props are typed
All mobile screen components SHALL use typed navigation props (e.g., `NativeStackScreenProps`) instead of `any`.

#### Scenario: Navigation type errors are caught at compile time
- **WHEN** a screen accesses `route.params`
- **THEN** TypeScript SHALL know the expected parameter types
- **THEN** accessing non-existent parameters SHALL produce a type error
