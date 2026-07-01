/**
 * database/module.ts — Composition root for the database layer.
 *
 * Creates and wires all collection implementations. Services receive only
 * the narrow interfaces they need via constructor injection. No service
 * should import this file directly; wiring happens in app.ts / index.ts.
 */
import {
  SupabaseUserCollection,
  SupabaseGradeCollection,
  SupabaseNotificationCollection,
  SupabaseAssignmentCollection,
  SupabaseAttendanceCollection,
  SupabaseConceptCollection,
  SupabaseTextbookCollection,
  SupabaseChapterCollection,
  SupabaseClassCollection,
  SupabaseSubjectCollection,
} from './collections';
import { TransactionManager } from './transaction-manager';
import { ConnectionManager } from './connection-manager';
import type {
  UserCollection,
  GradeCollection,
  NotificationCollection,
  AssignmentCollection,
  AttendanceCollection,
  ConceptCollection,
  TextbookCollection,
  ChapterCollection,
  ClassCollection,
  SubjectCollection,
} from './interfaces/collections';

export interface DatabaseModule {
  users: UserCollection;
  grades: GradeCollection;
  notifications: NotificationCollection;
  assignments: AssignmentCollection;
  attendance: AttendanceCollection;
  concepts: ConceptCollection;
  textbooks: TextbookCollection;
  chapters: ChapterCollection;
  classes: ClassCollection;
  subjects: SubjectCollection;
  transactionManager: TransactionManager;
  connectionManager: ConnectionManager;
}

let _module: DatabaseModule | null = null;

/**
 * Returns the singleton DatabaseModule, creating it on first call.
 * Subsequent calls return the same instance.
 */
export function createDatabaseModule(): DatabaseModule {
  if (_module) return _module;

  _module = {
    users: new SupabaseUserCollection(),
    grades: new SupabaseGradeCollection(),
    notifications: new SupabaseNotificationCollection(),
    assignments: new SupabaseAssignmentCollection(),
    attendance: new SupabaseAttendanceCollection(),
    concepts: new SupabaseConceptCollection(),
    textbooks: new SupabaseTextbookCollection(),
    chapters: new SupabaseChapterCollection(),
    classes: new SupabaseClassCollection(),
    subjects: new SupabaseSubjectCollection(),
    transactionManager: new TransactionManager(),
    connectionManager: ConnectionManager.getInstance(),
  };

  return _module;
}

/** Reset module (used in tests to inject mock implementations). */
export function resetDatabaseModule(overrides?: Partial<DatabaseModule>): void {
  _module = overrides
    ? { ...createDatabaseModule(), ...overrides }
    : null;
}
