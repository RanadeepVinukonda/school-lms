## ADDED Requirements

### Requirement: All list queries use database-level filtering
No service SHALL load all documents from a collection and filter/sort/paginate in JavaScript. All `where`, `orderBy`, `limit`, and `offset` clauses SHALL be translated to database-level queries.

#### Scenario: User listing uses database pagination
- **WHEN** `userService.listTeachers()` is called
- **THEN** the query SHALL include `.eq('role', 'teacher')` at the database level
- **THEN** pagination SHALL use `.range()` or SQL `LIMIT`/`OFFSET`, not `Array.slice()`

#### Scenario: Notification listing uses database sort
- **WHEN** `notificationService.getNotifications()` is called
- **THEN** the `orderBy` clause SHALL be sent to the database, not applied in JavaScript

### Requirement: In-memory filtering is removed from all services
Every service that currently loads-all-then-filters-in-memory SHALL be refactored to use adapter query methods.

#### Scenario: All services verified
- **WHEN** scanning `services/*.ts` for `.filter()`, `.sort()`, `.slice()` on arrays returned by `get()`/`list()`
- **THEN** zero occurrences SHALL remain that load unfiltered data then filter in-memory
