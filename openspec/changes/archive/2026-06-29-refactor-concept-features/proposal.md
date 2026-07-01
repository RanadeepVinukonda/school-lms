## Why

The current concept view features include release controls and visual noise that are unnecessary or inefficient. Simplifying these settings, consolidating the study material views, and restricting the AI-generated question types will improve user experience and reduce token usage.

## What Changes

- Remove the "Student Release & Push Settings" card from the teacher concept page and replace it with a single "Push Concept to Students" button.
- Ensure that students can access the concept notes, mind maps, and resources only after the teacher has pushed/released the concept using this single button.
- Rename the "Notes" tab to "Study Material" on both teacher and student concept view pages.
- Combine and display the summary, notes, key points, formulas, examples, and learning objectives in order within the "Study Material" tab.
- Remove the "Questions" tab from the teacher concept page and the "Practice" tab from the student concept page.
- Limit live preview of questions to the Publish Test dialog/modal.
- Update textbook extraction prompts (in backend worker and frontend service) to generate only the six question types defined in the template list.
- Remove the empty/invalid difficulty badge outline beside the video count badge.

## Capabilities

### New Capabilities
- `refactor-concept-features`: Refactoring concept detail views, release behavior, question bank display, and limiting generated question types.

### Modified Capabilities

## Impact

- Frontend: `TeacherConceptViewPage.tsx`, `StudentConceptPage.tsx`, `aiService.ts`, `textbookService.ts`
- Backend: `worker.ts`
