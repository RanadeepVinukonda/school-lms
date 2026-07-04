## ADDED Requirements

### Requirement: Inline supabase calls moved to React Query
The inline `supabase.from(...).select()` calls in `App.tsx` and `AdminLayout.tsx` SHALL be moved to `useQuery` hooks from `@tanstack/react-query`.

#### Scenario: Root component does not make API calls during render
- **WHEN** `App.tsx` renders
- **THEN** no supabase queries SHALL execute in the render path
- **THEN** all queries SHALL use `useQuery` or `useEffect`

### Requirement: N+1 queries eliminated
The `NotificationDropdown` component SHALL batch user lookups with a single `supabase.from('users').select('*').in('id', [...])` instead of querying per notification.

#### Scenario: Notification list loads efficiently
- **WHEN** a dropdown with 20 notifications renders
- **THEN** exactly 1 user query SHALL be made (not 20)

### Requirement: Analytics never shows undefined or NaN
All analytics template expressions SHALL guard against null/undefined/NaN values. The string "undefined" or "NaN" SHALL never appear in the UI.

#### Scenario: Average performance with no data
- **WHEN** a school has no exam data for the selected period
- **THEN** analytics SHALL display "0%" or "No data" instead of "undefined%"

### Requirement: Class-section dropdowns display "Class X-Y" format
All class dropdowns (attendance, fee, timetable, notices) SHALL display options as "Class {number}-{section}" concatenation, not just the class name.

#### Scenario: Class with two sections shows both
- **WHEN** an admin opens the attendance class dropdown with Class 5A and 5B
- **THEN** the dropdown SHALL show "Class 5-A" and "Class 5-B" as distinct options

### Requirement: Dark mode variants on all input placeholders
Placeholder text across all input fields SHALL use consistent font weight and include `dark:` variant color that meets 4.5:1 contrast.

#### Scenario: Placeholder renders in dark mode
- **WHEN** a user enables dark mode and focuses an input
- **THEN** the placeholder text SHALL have proper contrast and consistent font weight

### Requirement: Quick links displayed in organized grid
The EPR dashboard quick links section SHALL display links in a responsive grid layout with clear labeling, spacing, and visual hierarchy.

#### Scenario: EPR dashboard loads
- **WHEN** a teacher views the EPR dashboard
- **THEN** quick links SHALL render in a clean grid with proper spacing

### Requirement: Badges displayed in neat grid
The student rewards page SHALL display badges in a responsive grid with proper sizing, spacing, and visual presentation.

#### Scenario: Rewards page loads
- **WHEN** a student views the rewards page
- **THEN** badges SHALL render in a clean grid layout with icons, names, and dates

### Requirement: Back navigation from stream projects
The coding page SHALL include a back navigation button when viewing stream projects.

#### Scenario: Student navigates back
- **WHEN** a student is viewing stream projects
- **THEN** a visible back button SHALL be present
- **THEN** clicking it SHALL return to the previous view

### Requirement: Student timetable auto-loads
The timetable page SHALL automatically load the timetable for the logged-in student's class-section.

#### Scenario: Student views timetable
- **WHEN** a student visits the timetable page
- **THEN** the timetable SHALL display the schedule for their enrolled class-section
- **THEN** the header SHALL show "Class X-Y Timetable"
