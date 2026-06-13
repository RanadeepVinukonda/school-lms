# Changelog

## [Unreleased] - 2026-06-13

- Replaced all `grid-cols-3` Tailwind classes with `grid-cols-2` for more varied layouts.
- Wrapped the application in an `ErrorBoundary` to catch runtime errors.
- Added a global container (`container mx-auto px-4`) around the router for consistent max‑width handling.
- Updated imports for `ErrorBoundary`.
- Ensured interactive components have hover, active, and focus feedback.
- All tests pass.
- Wired up the custom `NotFoundPage` in the router (was previously redirecting to welcome).
- Added accessible skip-to-content links to all layouts (Auth, Student, Teacher, Admin).
- Added `scroll-behavior: smooth` and a subtle fixed grain/noise overlay for visual depth.
- Changed badge shape from `rounded-full` (pill) to `rounded-md` (square) for a less generic look.
- Changed avatar shape from `rounded-full` (circle) to `rounded-xl` (squircle).
- Normalized AboutSchoolPage border-radii to use design tokens (`rounded-xl`).
- Added Privacy and Terms legal links to the AuthLayout and WelcomePage footers.
- Added `tabIndex`, `role="button"`, and `focus-visible:ring` to the interactive card in AdminAuditLogsPage.
