## Context

The school LMS currently has:
- Academic year management (already functional)
- Class creation but incomplete cascading deletion
- Teacher assignment flow that allows inline registration (should be Class Hub only)
- Teacher dashboard that shows all data without class scoping
- Student views that show all content regardless of push state
- No concept-level progress tracking
- Mindmaps and tests lack controlled delivery mechanism

Stakeholders: Admin (manages structure), Teachers (deliver content), Students (consume content).

## Goals / Non-Goals

**Goals:**
- Full class lifecycle: create → populate → teach → delete with proper cascading
- Teacher workspace scoped to one class at a time with easy switching
- Controlled content delivery: students see only what teachers push
- Concept-level progress tracking for teachers
- AI-assisted test generation with template persistence

**Non-Goals:**
- Changing academic year management (already works)
- Modifying student registration flow beyond class assignment
- Changing teacher profile management (already in Class Hub)
- Push notifications or real-time updates
- Analytics dashboards beyond basic progress tracking

## Decisions

### 1. Class Scoping via Context Provider
**Decision**: Wrap teacher routes in a `ClassScope` context provider. Selected class ID stored in React context + localStorage for persistence across refreshes.

**Why**: Simple, no backend changes needed for scoping. localStorage ensures class persists without requiring server round-trip on every page load.

**Alternative**: Server-side session state - rejected for complexity and latency.

### 2. Cascading Delete via Cloud Functions
**Decision**: Firestore trigger on class document deletion cascades to subcollections: students, subjects, teacherAssignments. Subject deletion cascades to textbooks, chapters, concepts, lectures, notes, mindmaps, questionBanks, testTemplates.

**Why**: Firestore doesn't support cross-collection cascading natively. Cloud functions ensure atomicity and handle cleanup asynchronously.

**Alternative**: Client-side multi-delete - rejected for reliability and race conditions.

### 3. Push State as Firestore Field
**Decision**: Each content type (mindmap, test template) gets a `pushed: boolean` field. Student queries filter by `pushed == true`. Teacher sees all regardless.

**Why**: Simple query filter, no separate student-facing collections. Easy to toggle.

**Alternative**: Separate student collection with pushed content - rejected for data duplication.

### 4. AI Test Generation
**Decision**: Client calls a cloud function that uses Gemini API to generate questions based on concept context. Questions stored in concept's questionBank subcollection. Templates stored separately.

**Why**: Server-side API key security. Cloud function can access concept context for better generation.

**Alternative**: Client-side generation - rejected for API key exposure.

### 5. Concept Progress Tracking
**Decision**: `completed: boolean` field on concept document per teacher. Teacher marks complete. Student view aggregates completion across concepts in a subject.

**Why**: Simple boolean, teacher-controlled. Aggregation is a simple query.

**Alternative**: Percentage-based tracking - rejected for complexity without clear benefit.

## Risks / Trade-offs

- **Large class deletion**: Cascading delete of many students/subjects may timeout → Mitigation: Use batched deletes with retry logic
- **AI generation quality**: Generated questions may need editing → Mitigation: Store in question bank for teacher review before push
- **Class switching latency**: Context switch requires re-fetching class data → Mitigation: Prefetch on class selection, cache in context
- **Push state consistency**: Students may see stale content → Mitigation: Real-time listeners on pushed content queries
