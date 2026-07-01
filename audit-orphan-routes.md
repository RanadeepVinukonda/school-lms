# Route Audit — Placeholders & Orphans

## Placeholder Routes

### 1. `lms/api/[...slug].ts`
**Handler:** Returns `{ hello: 'world', path: req.url }` — static catch-all stub.
**Recommendation:** Replace with a 404 handler or remove if unused.

## Orphan Routes (not wired in `routes/index.ts`)

### 2. `virtual-labs.routes.ts` → should mount at `/virtual-labs`
| Method | Path | Handler |
|--------|------|--------|
| GET | `/` | `virtualLabsController.getAllLabs` |
| GET | `/:id` | `virtualLabsController.getLabById` |
| POST | `/` | `virtualLabsController.createLab` |
| PUT | `/:id` | `virtualLabsController.updateLab` |
| DELETE | `/:id` | `virtualLabsController.deleteLab` |
| POST | `/:id/complete` | `virtualLabsController.markLabCompleted` |
| GET | `/progress/:studentId` | `virtualLabsController.getStudentProgress` |

### 3. `unified-test-engine.routes.ts` → should mount at `/unified-test-engine`
| Method | Path | Handler |
|--------|------|--------|
| POST | `/create` | `ctrl.createTest` |
| POST | `/preview` | `ctrl.previewTest` |
| GET | `/class/:classId` | `ctrl.listTestsForClass` |
| GET | `/my` | `ctrl.listTestsForTeacher` |
| GET | `/attempts/my` | `ctrl.getStudentAttempts` |
| GET | `/attempts/student/:studentId` | `ctrl.getStudentAttempts` |
| GET | `/class/:classId/attempts` | `ctrl.getClassAttempts` |
| GET | `/:testId` | `ctrl.getTest` |
| PATCH | `/:testId` | `ctrl.updateTest` |
| DELETE | `/:testId` | `ctrl.deleteTest` |
| POST | `/:testId/republish` | `ctrl.republishTest` |
| POST | `/:testId/start` | `ctrl.startTestAttempt` |
| POST | `/attempts/:attemptId/submit` | `ctrl.submitTestAttempt` |
| GET | `/:testId/results` | `ctrl.getTestResults` |
| PUT | `/:testId/results` | `ctrl.releaseTestResults` |
| GET | `/templates/my` | `ctrl.listTemplates` |
| POST | `/templates` | `ctrl.createTemplate` |
| PUT | `/templates/:templateId` | `ctrl.updateTemplate` |
| DELETE | `/templates/:templateId` | `ctrl.deleteTemplate` |

### 4. `ai-question-generator.routes.ts` → should mount at `/ai-question-generator`
| Method | Path | Handler |
|--------|------|--------|
| POST | `/generate` | `ctrl.generateForConcept` |
| POST | `/generate-and-save` | `ctrl.generateAndSave` |
| POST | `/from-textbook` | `ctrl.generateFromTextbook` |
| POST | `/fill-missing` | `ctrl.fillMissingTypes` |

### 5. `content-publishing.routes.ts` → should mount at `/content-publishing`
| Method | Path | Handler |
|--------|------|--------|
| POST | `/` | `ctrl.publishContent` |
| GET | `/my` | `ctrl.getStudentContent` |
| GET | `/stats` | `ctrl.getContentStats` |
| GET | `/:classId` | `ctrl.getPublishedContent` |
| DELETE | `/:publishId` | `ctrl.unpublishContent` |

### 6. `concept-progress.routes.ts` → should mount at `/concept-progress`
| Method | Path | Handler |
|--------|------|--------|
| POST | `/toggle` | `conceptProgressController.toggleCompletion` |
| GET | `/status/:conceptId/:classId` | `conceptProgressController.getStatus` |
| GET | `/class/:classId` | `conceptProgressController.getClassStatus` |
| GET | `/subject/:subjectId/:classId` | `conceptProgressController.getSubjectProgress` |
| GET | `/student/:classId` | `conceptProgressController.getStudentProgress` |

## Summary
- **1 placeholder** in `api/[...slug].ts` (returns static response)
- **5 orphan route files** with 40 total routes not wired into the app
- **0 redirect controllers** found
