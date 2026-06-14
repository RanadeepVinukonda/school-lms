# Genesis Adaptive Learning Platform: Development Roadmap & Remaining Tasks

This checklist serves as the roadmap for the project, tracking what has already been built vs. what is pending in the next phases of development based on the Consolidated Vision.

---

## 1. Completed Features

- `[x]` **Core LMS Architecture**: Authentication, multi-tenant databases, route-level security, and rate limiting.
- `[x]` **Student Dashboard & Portals**: Student dashboard page, subject detail panels, lesson views, assignments lists, and quiz attempts.
- `[x]` **Teacher Textbook Upload Pipeline**: PDF file uploads to Cloudinary with background parsing workers.
- `[x]` **Real-time Processing Log Terminal**: Polling-based live scrolling terminal console directly below overall progress bar in the teacher textbook detail view.
- `[x]` **Curriculum Layout Extraction**: AI-based Table of Contents (TOC) scanning (Gemini 2.0) that generates multi-chapter structured curriculum trees.
- `[x]` **AI Concept Enrichment**: Parallel BullMQ queues fetching local WASM embeddings (transformers.js), matched YouTube videos, web resources, study notes, and a 36-question bank for every single extracted concept.
- `[x]` **Adaptive Quizzing**: Adaptive testing portal that dynamically updates question difficulty based on student performance.
- `[x]` **Admin Console**: Classes management, audit logs tracker, user management, and subject panels.

---

## 2. Left Tasks (Phase-by-Phase Roadmap)

### Phase 2: Personalization, Analytics, and Parent Portals

#### [ ] Parent Integration Layer
- `[ ]` **Parent Portal Dashboard**: Design parent login views and links to monitor their child's daily/weekly activity.
- `[ ]` **AI Reporting & Progress**: Generate automated weekly summaries highlighting child learning gaps (e.g. "Struggling in Geometry").
- `[ ]` **Recommendations Engine**: Provide parent actions checklist (e.g. "Recommend 15 min daily practice on Fractions").

#### [ ] Analytics & ERP
- `[ ]` **School-wide Comparison Panels**: Enable admin comparison charts (Grade vs. Grade, Teacher vs. Teacher performance).
- `[ ]` **Attendance Module**: Track student and teacher attendance logs with exports.
- `[ ]` **Fee & School ERP Integration**: Add fee schedules, payment collection gateway portals, transport tracking, and HR admin dashboard tabs.

---

### Phase 3: AI Tutor, Textbooks OCR, and Advanced Content

#### [ ] AI Tutor Module
- `[ ]` **24/7 Chatbot Workspace**: Build student sandbox tutor chat using Gemini/OpenAI endpoints.
- `[ ]` **Voice Interaction**: Integrate Web Speech API (Speech-to-Text / Text-to-Speech) for voice-enabled doubt solving.
- `[ ]` **Step-by-step Explainer**: Format mathematical equations and code structures dynamically using LaTeX/Markdown components.

#### [ ] Textbook Page OCR Mapping
- `[ ]` **Camera Capture Integration**: Allow mobile/web camera page snapshot capture in mapping UI.
- `[ ]` **OCR Scanning Engine**: Implement text extraction from photos, map it to a concept, and auto-generate interactive assessments on the spot.

#### [ ] Advanced AI Question Generation
- `[ ]` **NEP-aligned Question Sets**: Expand textbook parser to generate Olympiad, Competency-Based, and Viva questions.
- `[ ]` **AI Assignment Rubrics**: Enable AI-generated grading rubrics and customized feedback summaries for homework.

---

### Phase 4: Mind Mapping, Gamification, and Simulations

#### [ ] Interactive Mind Mapping
- `[ ]` **Interactive Builder**: Enable students and teachers to create, add custom nodes, edit labels, and structure revision maps manually.
- `[ ]` **Sharing Pipeline**: Allow students to share mind maps with classmates and teachers to pin resources.

#### [ ] Gamification Engine
- `[ ]` **XP & Coins System**: Trigger rewards when lessons are completed or assessment accuracies are high.
- `[ ]` **Badge Collections**: Create visual trophies shelf for students.
- `[ ]` **Daily Challenges**: Setup leaderboard rankings and daily learning targets checklist.

#### [ ] Virtual Labs (Simulations)
- `[ ]` **Brilliant.org-Style Labs**: Embed interactive simulations for Physics (circuits, mechanics), Chemistry (reactions), and Biology (cell structure).

---

### Phase 5: Pre-Primary, Skills, and Mobile Apps

#### [ ] Pre-Primary Module
- `[ ]` **K-2 Dashboard**: Simple, visual layouts for Nursery, LKG, and UKG students.
- `[ ]` **Visual Tracing & Phonics**: Add drag-and-draw canvas tracers, audio-phonics games, stories slideshows, and flashcards.

#### [ ] Skill & STREAM Education
- `[ ]` **Coding & Circuits Workspace**: Setup embedded JS/Python code sandbox and sensor circuit simulator.
- `[ ]` **STREAM Cross-subject Projects**: Implement catalog of collaborative STREAM projects.

#### [ ] Native Mobile Apps & Offline Mode
- `[ ]` **Cross-Platform Apps**: Develop React Native wrappers for Android and iOS app store compatibility.
- `[ ]` **Offline Database Sync**: Setup offline data storage (SQLite/WatermelonDB) to download lessons and sync test results later.
- `[ ]` **Multilingual Layout**: Provide native toggle support for Telugu and Hindi translations.
