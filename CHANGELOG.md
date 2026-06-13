# Changelog

## [Unreleased] - 2026-06-13

- Replaced all `grid-cols-3` Tailwind classes with `grid-cols-2` for more varied layouts.
- Wrapped the application in an `ErrorBoundary` to catch runtime errors.
- Added a global container (`container mx-auto px-4`) around the router for consistent max‑width handling.
- Updated imports for `ErrorBoundary`.
- Ensured interactive components have hover, active, and focus feedback.
- All tests pass.
