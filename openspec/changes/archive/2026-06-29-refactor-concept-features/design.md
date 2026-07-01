## Context

The current user interface displays settings for release/push controls that are no longer needed. The concept details show disconnected blocks (Study Notes, Learning Objectives, Keywords, etc.) and a separate "Questions" tab that exposes the question bank. In addition, textbook extraction generates a large number of question types that are not usable in the test creation templates, which costs unnecessary API tokens.

This design outlines the technical approach to consolidate the study content, simplify the student-side access, restrict the generated question types, and clean up the UI.

## Goals / Non-Goals

**Goals:**
- Remove the "Student Release & Push Settings" card from the teacher concept view and replace it with a single "Push Concept" toggle button.
- Ensure students can access all materials (notes, mind maps, and resources) only after the teacher pushes/releases the concept.
- Consolidate all concept notes content (learning objectives, summary, notes, key points, formulas, and examples) in a single ordered "Study Material" tab on both the teacher and student pages.
- Remove the "Questions" tab from the teacher concept view page and the "Practice" tab from the student concept view page.
- Limit generated question types in textbook processing (backend worker and frontend service) to the six standard template types.
- Fix the empty oval/circle badge issue next to the video pill.

**Non-Goals:**
- Deleting the underlying tables or fields from the database (we will preserve them, but only fetch/use what is needed).
- Removing the "Quiz" or test-taking capabilities for students.

## Decisions

### Decision 1: Rename and Consolidate Notes Tab
- **Action**: Rename the tab from "Notes" (or "Learn") to "Study Material".
- **Rationale**: Combining objectives, summary, notes, key points, formulas, and examples into one continuous, structured page is cleaner than having multiple separate cards or scattered fields.
- **Details**:
  - Split the `learning_objectives` string fetched from the database into an array of strings in `textbookService.ts`.
  - Fetch `key_points`, `formulas`, and `examples` in `textbookService.ts` and attach them to the `Concept` object.

### Decision 2: Single Button Release Control
- **Action**: Replace multiple release switches on the teacher side with a single "Push Concept to Students" button. Under the hood, this toggles `mindMapReleased`, `questionBankReleased`, and `assignmentsReleased` simultaneously.
- **Rationale**: Gives the teacher simple one-click publishing control while locking the student out of the concept page entirely until published.
- **Details**:
  - Show a full-page lock overlay in `StudentConceptPage.tsx` if `release?.mindMapReleased` is false.
  - Update `StudentChapterPage.tsx` release badge helper to show `Locked` or `Released` based on `release?.mindMapReleased`.

### Decision 3: Narrow AI Question Types
- **Action**: Change prompts in `worker.ts` and `aiService.ts` to request exactly 3 questions for each of the six template types: `mcq`, `true_false`, `fill_blank`, `matching`, `numerical`, `descriptive`.
- **Rationale**: Saves token usage and ensures generated questions always map to template options.

## Risks / Trade-offs

- **[Risk]** Missing difficulty values causing empty badge rendering.
  - **Mitigation**: Add a conditional check in the React rendering code to only show the difficulty badge if the string is present and non-empty.
