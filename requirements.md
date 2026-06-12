# Requirements Document

## Introduction

OpenCode LMS is a full-stack Learning Management System built on top of an existing React/Vite/TypeScript/TailwindCSS frontend and a TypeScript/Express backend, using Firebase (Firestore, Auth, Storage) as the data and identity layer. The system serves three distinct roles — Admin (Principal), Teacher, and Student — each with isolated portals, dedicated workflows, and scoped data access. Core capabilities include: role-based access control (RBAC), class and subject management, teacher allocation with uniqueness enforcement, student registry with auto-generated IDs, AI-driven textbook parsing and question generation, an eTutor-style modular test template engine, a Normal examination console, an Interactive (republished) examination console with real-time feedback, and an adaptive AI profiling engine that adjusts student difficulty levels after each submission.

---

## Glossary

- **LMS**: Learning Management System — the OpenCode platform described in this document.
- **Admin**: The principal-level user who manages classes, subjects, teachers, and students.
- **Teacher**: A user assigned to teach one or more subjects within specific classes.
- **Student**: A user enrolled in exactly one class who takes assessments.
- **Class**: An academic cohort defined by grade, section, and academic year (e.g., "Grade 10 - Section A, 2026–2027").
- **Subject**: An academic discipline (e.g., Mathematics) associated with exactly one class.
- **Junction**: A `teacher-class-subject` document whose ID is `classId_subjectId`, enforcing the one-teacher-per-subject-per-class constraint.
- **Textbook**: A PDF uploaded by a teacher that is parsed by the AI Pipeline into chapters, concepts, notes, video links, and questions.
- **AI_Pipeline**: The asynchronous backend worker that calls the LLM to extract and generate structured content from a Textbook.
- **Concept**: A leaf-level unit of a textbook chapter that carries study notes, video link suggestions, and a Question_Bank.
- **Question_Bank**: The embedded array of Question objects stored within a Concept document.
- **Question**: A single assessment item with type, difficulty, text, options, correct answer, and point value.
- **Template**: A teacher-configured reusable test blueprint specifying question count, time limit, difficulty distribution, allowed question formats, and shuffle toggle.
- **Question_Paper**: A compiled, immutable snapshot of questions selected from a Question_Bank according to a Template.
- **Test**: A published assessment instance linking a Question_Paper to a class, subject, teacher, type, and scheduling metadata.
- **Normal_Console**: The full-screen examination interface used for standard (non-republished) Tests.
- **Interactive_Console**: The republished Test interface that provides immediate per-question feedback with audio and visual cues.
- **Question_Palette**: The floating navigation panel in both consoles showing question status (Unvisited, Visited, Attempted, Marked for Review).
- **Profiling_Engine**: The backend service that recalculates a Student's adaptive level after each Test submission.
- **Student_ID**: The auto-generated unique identifier formatted as `[AcademicYear]_[ClassCode]_[RollNo]` (e.g., `2026_10A_05`).
- **RBAC**: Role-Based Access Control enforcing that Admins, Teachers, and Students see only their permitted data and actions.
- **Concept_Health**: An admin-visible metric showing the class-wide mastery percentage for a given Concept.
- **Accuracy**: The ratio of points earned to total points on a Test submission, expressed as a percentage.
- **Complexity**: The maximum difficulty rank of questions correctly answered in a Test submission (0 = none, 1 = medium, 2 = hard/hots).
- **Adaptive_Level**: A Student's current global proficiency classification: `beginner`, `intermediate`, or `advanced`.

---

## Requirements

### Requirement 1: Role-Based Access Control

**User Story:** As an Admin, Teacher, or Student, I want the system to enforce role-based access so that each user only sees and operates on data relevant to their role.

#### Acceptance Criteria

1. THE LMS SHALL assign exactly one role (`admin`, `teacher`, or `student`) to every authenticated user at account creation time.
2. WHEN a user authenticates, THE LMS SHALL load only the UI portal and data permitted for that user's role: Admin users have unrestricted access to all classes, subjects, teachers, and students; Teacher users have access only to classes and subjects listed in their Junction records; Student users have access only to data belonging to their assigned class.
3. IF a user attempts to access a route or resource outside their permitted role scope, THEN THE LMS SHALL block the action, return an authorization error, and redirect the user to their role-appropriate dashboard.
4. WHILE a Teacher is authenticated and has zero Junction records, THE LMS SHALL return an empty data set for all class and subject queries without error.
5. WHILE a Student is authenticated with a null or absent `classId` field, THE LMS SHALL deny data access and return an error indicating an incomplete account configuration.

---

### Requirement 2: Class and Subject Management

**User Story:** As an Admin, I want to create and manage classes and subjects so that the academic structure of the institution is correctly reflected in the system.

#### Acceptance Criteria

1. WHEN an Admin submits a request to create a Class, THE LMS SHALL validate that grade is a non-empty string of 1–20 characters, section is a non-empty string of 1–10 characters, and academic year matches the pattern `YYYY-YYYY`.
2. IF a Class with the same grade, section, and academic year already exists, THEN THE LMS SHALL reject the creation and return a descriptive conflict error identifying the duplicate fields.
3. WHEN a valid Class creation request is submitted, THE LMS SHALL persist the Class document with `isActive: true` and a server-generated `createdAt` timestamp.
4. WHEN an Admin submits a request to create a Subject, THE LMS SHALL validate that name is a non-empty string of 1–100 characters, code is a non-empty alphanumeric string of 1–20 characters, and the selected Class exists.
5. IF the selected Class does not exist, THEN THE LMS SHALL reject the Subject creation and return a descriptive error identifying the invalid Class reference.
6. WHEN a valid Subject creation request is submitted, THE LMS SHALL associate the Subject with the selected Class.
7. IF a Subject code already exists within the same Class (case-insensitive comparison), THEN THE LMS SHALL reject the creation and return a descriptive conflict error identifying the duplicate code.

---

### Requirement 3: Teacher Allocation with Uniqueness Enforcement

**User Story:** As an Admin, I want to assign teachers to subjects within classes so that each subject in a class is covered by exactly one teacher.

#### Acceptance Criteria

1. WHEN an Admin submits a Teacher assignment request, THE LMS SHALL validate that the specified Teacher, Subject, and Class records all exist before proceeding.
2. IF any of the referenced Teacher, Subject, or Class records do not exist, THEN THE LMS SHALL reject the assignment and return a descriptive error identifying which record was not found.
3. WHEN all records are valid, THE LMS SHALL check whether a Junction document for that Subject-Class combination already exists in `teacher-class-subject`.
4. IF a Junction document for that Subject-Class combination already exists, THEN THE LMS SHALL reject the assignment and return an error message indicating that subject is already assigned to a teacher.
5. WHEN no conflicting Junction exists, THE LMS SHALL create the Junction document with `teacherId`, `classId`, `subjectId`, and an `assignedAt` timestamp, and return a success confirmation to the Admin.
6. THE LMS SHALL enforce the uniqueness constraint at the Firestore document-ID level so that concurrent duplicate assignment attempts result in at most one successful write.

---

### Requirement 4: Teacher Credential Generation

**User Story:** As an Admin, I want to generate unique credentials for teachers so that teachers can securely log in to the system.

#### Acceptance Criteria

1. WHEN an Admin submits a Teacher creation request, THE LMS SHALL validate that display name is 1–100 characters and that email address conforms to RFC 5321 format before proceeding.
2. IF the submitted email address does not meet format requirements or is already registered in Firebase Authentication, THEN THE LMS SHALL reject the request and return a descriptive error identifying whether the failure was a format violation or a duplicate email conflict.
3. WHEN a valid Teacher creation request is submitted, THE LMS SHALL generate an initial password of at least 12 characters containing at least one uppercase letter, one lowercase letter, one digit, and one special character, then register the account via Firebase Authentication.
4. WHEN a Teacher account is successfully registered in Firebase Authentication, THE LMS SHALL persist a user document in Firestore with `role: "teacher"` and `isActive: true`.
5. WHEN a Teacher account is successfully created, THE LMS SHALL present the generated credentials to the Admin in a dismissible modal exactly once; the credentials SHALL NOT be persisted in any retrievable form after the modal is closed.
6. IF Firestore persistence fails after Firebase Authentication registration succeeds, THEN THE LMS SHALL return a descriptive error and SHALL NOT leave a partial user document in Firestore.

---

### Requirement 5: Student Registry and ID Generation

**User Story:** As an Admin, I want to register students with auto-generated unique IDs so that each student has a consistent, traceable identity in the system.

#### Acceptance Criteria

1. WHEN an Admin submits a Student creation request, THE LMS SHALL validate that display name is 1–100 characters, the referenced Class exists, academic year matches `YYYY-YYYY`, and roll number is a positive integer.
2. WHEN a Student is created, THE LMS SHALL auto-generate a Student_ID formatted as `[AcademicYear]_[ClassCode]_[RollNo]` where RollNo is zero-padded to two digits (e.g., `2026_10A_05`).
3. THE LMS SHALL store the Student_ID in the user document's `studentId` field.
4. IF a Student_ID already exists within the same class and academic year, THEN THE LMS SHALL reject the creation, display a conflict error naming the duplicate roll number, and leave the existing student record unchanged.
5. WHEN a Student account is successfully created, THE LMS SHALL persist a user document with `role: "student"`, `isActive: true`, `classId`, `rollNo`, `academicYear`, and `level: "beginner"` as the initial Adaptive_Level.
6. IF any required field is missing or invalid, THEN THE LMS SHALL reject the Student creation request and return a descriptive validation error identifying each invalid field before any data is written.

---

### Requirement 6: Textbook Upload and AI Processing

**User Story:** As a Teacher, I want to upload a textbook PDF so that the AI Pipeline can extract chapters, concepts, notes, video link suggestions, and a question bank automatically.

#### Acceptance Criteria

1. WHEN a Teacher submits a file upload for a Subject assigned to that Teacher, THE LMS SHALL validate that the file is of type `application/pdf` and does not exceed 50 MB before accepting the upload.
2. IF the uploaded file is not a valid PDF or exceeds 50 MB, THEN THE LMS SHALL reject the upload without storing any partial file in Firebase Storage and return a descriptive error identifying the violation.
3. WHEN a valid PDF is uploaded, THE LMS SHALL store the file in Firebase Storage and create a Textbook document with `status: "processing"`.
4. WHEN the Textbook document is created, THE LMS SHALL enqueue an asynchronous AI_Pipeline job to process the PDF.
5. WHEN the AI_Pipeline completes successfully, THE LMS SHALL persist the extracted chapters and concepts as subcollections under the Textbook document and update `status` to `"ready"`.
6. WHEN the AI_Pipeline generates questions for a Concept, THE LMS SHALL store a minimum of 50 Question objects in the Question_Bank, with at least one Question of each type: `mcq`, `true_false`, `fill_blank`, `matching`, `descriptive`, `numerical`, and `passage`.
7. IF the AI_Pipeline fails, THEN THE LMS SHALL update the Textbook `status` to `"failed"` and deliver a notification to the Teacher via the Notification System containing the Textbook title and a description of the failure reason.
8. WHILE a Textbook `status` is `"processing"`, THE LMS SHALL display a processing indicator to the Teacher.
9. WHILE a Textbook `status` is `"processing"`, THE LMS SHALL prevent test creation from that Textbook and return an error if a test creation is attempted.
10. WHEN a Teacher attempts to re-upload a Textbook that has `status: "failed"`, THE LMS SHALL reset the Textbook `status` to `"processing"` and re-enqueue the AI_Pipeline job.

---

### Requirement 7: Question Reformatting Engine

**User Story:** As a Teacher, I want the system to reformat questions between types automatically so that assessments can be varied without manually rewriting questions.

#### Acceptance Criteria

1. WHEN a Template specifies `true_false` as an allowed format and the source question is of type `mcq`, THE LMS SHALL reformat the question by constructing a true/false statement from the question stem and the correct answer option, setting `type` to `true_false`, setting `options` to `["True", "False"]`, and setting `correctAnswer` to `"true"`.
2. WHEN a Template specifies `fill_blank` as an allowed format and the source question is of type `mcq`, THE LMS SHALL replace the correct answer text in the question stem with a blank placeholder, set `type` to `fill_blank`, remove the `options` array, and set the validator to perform case-insensitive exact matching against the original `correctAnswer` string.
3. WHEN a question is reformatted, THE LMS SHALL preserve the original `correctAnswer` value and `points` value without modification to either field.
4. WHEN a question is reformatted and then validated against its derived validator, THE LMS SHALL confirm that the reformatted `correctAnswer` satisfies the validator produced during the same reformatting operation.
5. IF a source question type does not support the requested reformatting target type, THEN THE LMS SHALL reject the reformatting operation, return a descriptive error identifying the unsupported source-to-target type pair, and leave the source question unchanged.

---

### Requirement 8: Test Template Creation

**User Story:** As a Teacher, I want to create reusable test templates so that I can quickly generate consistent assessments with controlled difficulty distribution, time limits, and question formats.

#### Acceptance Criteria

1. WHEN a Teacher submits a Template creation request, THE LMS SHALL validate that: title is 1–200 characters; time limit is an integer between 1 and 300 minutes; question count is an integer between 1 and 200; difficulty distribution values for easy, medium, hard, and hots are each integers between 0 and 100; and at least one allowed question format is selected.
2. IF the difficulty distribution percentages do not sum to exactly 100, THEN THE LMS SHALL reject the Template and return a validation error identifying the actual sum and the required sum.
3. WHEN a valid Template is saved, THE LMS SHALL persist the Template document under `test_templates` with the Teacher's `teacherId`, a server-generated `createdAt` timestamp, and return a success confirmation to the Teacher.
4. WHEN a Template has `jumbleQuestions: true` and a Question_Paper is compiled from it, THE LMS SHALL randomize the order of the selected questions array before persisting the Question_Paper.
5. WHEN a Question_Paper is compiled, THE LMS SHALL select questions from the Question_Bank matching the Template's difficulty distribution and allowed formats, calculate `totalPoints` as the sum of all selected question `points` values, and persist the Question_Paper under `question_papers` with `templateId` and a snapshot of the selected `questions` array.
6. IF the Question_Bank for the selected Concept or Chapter contains fewer questions than required by the Template's distribution for any difficulty tier, THEN THE LMS SHALL return a descriptive error identifying the difficulty tier that is insufficient and the shortfall count.

---

### Requirement 9: Publishing and Republishing Tests

**User Story:** As a Teacher, I want to publish assessments to my classes and optionally republish completed tests in interactive mode so that students can take assessments and receive feedback.

#### Acceptance Criteria

1. WHEN a Teacher submits a Test publication request, THE LMS SHALL validate that the selected Question_Paper exists, the type is one of `quiz`, `assignment`, or `exam`, the `releasedAt` timestamp is provided, and the `dueDate` (if provided) is after `releasedAt`.
2. IF the `dueDate` is provided and is not after `releasedAt`, THEN THE LMS SHALL reject the publication and return a descriptive validation error.
3. WHEN a valid Test publication request is submitted, THE LMS SHALL create a Test document with `isRepublished: false`, `showResults: false`, and `attemptCount: 0`.
4. WHEN a Teacher republishes a Test whose `dueDate` has passed or that the Teacher has manually closed, THE LMS SHALL create a new Test document with `isRepublished: true` referencing the same `paperId`.
5. WHEN a Student accesses a Test with `isRepublished: false`, THE LMS SHALL navigate the Student to the Normal_Console for that Test.
6. WHEN a Student accesses a Test with `isRepublished: true`, THE LMS SHALL navigate the Student to the Interactive_Console for that Test.

---

### Requirement 10: Normal Examination Console

**User Story:** As a Student, I want a full-screen examination interface with a question palette so that I can navigate, flag, and submit my answers under timed conditions.

#### Acceptance Criteria

1. WHEN a Student opens a non-republished Test, THE Normal_Console SHALL request full-screen mode and display the first question.
2. WHILE the Normal_Console is active, THE LMS SHALL display the countdown timer showing remaining time in MM:SS format at all times.
3. THE Normal_Console SHALL display a Question_Palette showing each question's current status: Unvisited (⚪), Visited (🟡), Attempted (🟢), or Marked for Review (🔵).
4. WHEN a Student navigates to a question without selecting any answer option, THE Normal_Console SHALL update that question's status to Visited (🟡) in the Question_Palette.
5. WHEN a Student selects at least one answer option for a question, THE Normal_Console SHALL update that question's status to Attempted (🟢) in the Question_Palette; IF the Student subsequently de-selects all options, THE Normal_Console SHALL revert the status to Visited (🟡).
6. WHEN a Student activates the "Mark for Review" control for an unanswered question, THE Normal_Console SHALL set that question's status to Marked for Review (🔵); IF the question already has a selected answer, the Marked for Review status SHALL take precedence over Attempted in the palette display.
7. WHEN the countdown timer reaches zero, THE Normal_Console SHALL auto-submit the Student's current answers without any further Student input and display the submission confirmation screen.
8. IF a Student attempts to exit full-screen mode during an active Test, THEN THE Normal_Console SHALL display a warning prompt and SHALL NOT terminate the Test session; WHEN the Student re-enters full-screen mode, THE Normal_Console SHALL resume without data loss.

---

### Requirement 11: Interactive Examination Console

**User Story:** As a Student, I want immediate audio-visual feedback on each answer in a republished test so that I can learn from mistakes in real time.

#### Acceptance Criteria

1. WHEN a Student opens a republished Test, THE Interactive_Console SHALL display one question at a time.
2. WHEN a Student selects an incorrect answer, THE Interactive_Console SHALL play an error audio cue, apply an error highlight to the selected option, and display a retry prompt indicating the answer was incorrect.
3. WHEN a Student submits an incorrect answer, THE Interactive_Console SHALL keep the current question active and allow the Student to select a different answer from the remaining unselected options.
4. WHEN a Student exhausts all incorrect options without selecting the correct answer, THE Interactive_Console SHALL reveal the correct answer, apply a success highlight to the correct option, and automatically advance to the next question.
5. WHEN a Student selects a correct answer, THE Interactive_Console SHALL play a success audio cue, apply a success highlight to the selected option, and automatically advance to the next question within 1000–2000 ms.
6. WHEN the Student answers the final question, THE Interactive_Console SHALL submit the attempt and display a results summary containing the total number of questions, the count of questions answered correctly on the first attempt, and the final score as a percentage.
7. IF audio playback is unavailable, THEN THE Interactive_Console SHALL continue to display all visual feedback without interruption, ensuring the interactive flow is not blocked by the missing audio.

---

### Requirement 12: Test Submission and Adaptive Level Calculation

**User Story:** As a Student, I want my performance to be analyzed after each test submission so that the system adapts future assessments to my current proficiency level.

#### Acceptance Criteria

1. WHEN a Student submits a Test, THE LMS SHALL persist the submission with the Student's answers, earned points, total points, per-question timestamps, and a server-generated submission timestamp.
2. WHEN a submission is persisted and total points is greater than zero, THE Profiling_Engine SHALL calculate Accuracy as `(earned points / total points) × 100`.
3. IF total points is zero, THE Profiling_Engine SHALL set Accuracy to 0 without performing division.
4. WHEN a submission is persisted, THE Profiling_Engine SHALL calculate Complexity as the maximum difficulty rank among correctly answered questions, where `easy = 0`, `medium = 1`, `hard = 2`, `hots = 2`; IF no questions are answered correctly, Complexity SHALL be set to 0.
5. IF Accuracy is greater than or equal to 85 AND Complexity is greater than or equal to 2, THEN THE Profiling_Engine SHALL set the Student's `level` to `"advanced"`.
6. IF Accuracy is greater than or equal to 70 AND Complexity is greater than or equal to 1 AND the condition in criterion 5 is not met, THEN THE Profiling_Engine SHALL set the Student's `level` to `"intermediate"`.
7. IF Accuracy is less than 70 OR Complexity is 0, THEN THE Profiling_Engine SHALL set the Student's `level` to `"beginner"`.
8. WHEN THE Profiling_Engine updates the Student's `level`, THE LMS SHALL persist the updated `level` to the user document in Firestore atomically with the submission record.
9. IF the atomic write in criterion 8 fails, THEN THE LMS SHALL retry the write up to three times before returning an error to the caller without discarding the submission record.

---

### Requirement 13: Admin Oversight Analytics

**User Story:** As an Admin, I want a dashboard showing class-wise performance, concept mastery, and the ability to flag low-mastery concepts so that I can monitor academic health and prompt corrective action.

#### Acceptance Criteria

1. THE Admin_Portal SHALL display class-wide and subject-wide average scores as percentages (0–100), aggregated from all student submissions for each class and subject.
2. THE Admin_Portal SHALL display each Student's score as a percentage, attempt status (`not started`, `in progress`, `submitted`, or `overdue`), and Adaptive_Level for every published Test.
3. WHEN Concept_Health for a Concept falls below 50% (fewer than half of the enrolled students in the class have achieved a score of 60% or higher on questions from that Concept), THE Admin_Portal SHALL visually flag that Concept with a distinct indicator.
4. WHEN an Admin selects a flagged Concept and confirms the re-teach action, THE LMS SHALL send a re-teach notification to the assigned Teacher via the Notification System containing the class name, subject name, and Concept title, and return a confirmation to the Admin.
5. WHEN a new Test submission is persisted that includes questions from a Concept, THE LMS SHALL recalculate Concept_Health for that Concept.

---

### Requirement 14: Notification System

**User Story:** As a Student or Teacher, I want to receive in-system notifications for relevant events so that I am always informed of upcoming tasks and required actions.

#### Acceptance Criteria

1. WHEN a Teacher publishes a Test, THE LMS SHALL generate a notification for every Student enrolled in the Test's target class at the time of publication.
2. WHILE a Student views their dashboard, THE LMS SHALL display unread notifications showing the test title, type, release timestamp, and due date if set.
3. WHEN an Admin sends a re-teach notification, THE LMS SHALL deliver it to the assigned Teacher's notification feed containing the class name, subject name, and Concept title.
4. WHEN a Student or Teacher marks a notification as read, THE LMS SHALL update the notification's read status and decrement the unread count.
5. WHEN a Student's due date for a Test passes without a submission being recorded, THE LMS SHALL mark that Test as overdue in the Student's dashboard with a distinct overdue label, separate from pending tests, that persists until the Student submits or the Teacher removes the Test.
6. WHEN a Student is enrolled in a class after a Test for that class has already been published, THE LMS SHALL generate a notification for that Student for the already-published Test.
