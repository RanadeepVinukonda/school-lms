## Context

This document describes the design for updating the School LMS application. The updates target data lifecycle management (cascade deletions), teacher onboarding/assignment, class-specific teacher dashboards (context switching), simplified textbook/concept structure, explicit content publishing (student visibility), and AI-integrated test generation.

## Goals / Non-Goals

**Goals:**
- Implement cascade deletion for academic years, classes, and subjects.
- Restrict teacher creation to the Teachers Tab in the Class Hub.
- Limit teacher assignments to existing teachers only.
- Implement a class selection screen after teacher login and a global switcher.
- Support multiple textbooks per subject.
- Simplify concept pages (keeping only Lecture, Notes & Resources, and Mindmap).
- Manage student visibility via explicit pushes (notes, resources, mindmaps, tests).
- Add "Mark as Completed" functionality to track concept progress.
- Revamp the test builder to support AI generation and manual entry.
- Implement a backend-only question bank linked to concepts.
- Remove all visibility management settings and pages.

**Non-Goals:**
- Redevelopment of frontend styles or major architectural refactoring of the DB engine.
- Modifying student login or signup flows.

## Decisions

- **Cascade Deletion logic**: We will build custom cascade service handlers to clean up child relations (except teachers) recursively in services (e.g. `academicYearService`, `classService`, and `subjectService`).
- **Teacher Assignment Flow**: Modify `AssignTeacher` component to fetch and list existing teachers via user service/Supabase query and remove any embedded creation logic.
- **Teacher dashboard and switcher**: Create a React Context or localStorage mechanism to store the selected `activeClassId`. If not set, redirect teacher to `/teacher/select-class` page. Add a dropdown switcher component in the dashboard header/sidebar.
- **Student Visibility**: Introduce `pushedAt` or `isPushed` properties in documents (mindmaps, notes, resources, tests) to restrict student-facing queries.
- **AI Test Generation**: Integrate AI question generation inside the test service, saving the results in a new `concept_questions` or `questions_bank` table and automatically appending to the active test template.

## Risks / Trade-offs

- [Risk] Cascade deletion might timeout if done in single REST call -> [Mitigation] Handle deletions in structured batches and log operations.
