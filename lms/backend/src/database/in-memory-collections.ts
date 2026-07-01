import type {
  Collection,
  UserCollection, GradeCollection, NotificationCollection,
  AssignmentCollection, AttendanceCollection, ConceptCollection,
  TextbookCollection, ChapterCollection, ClassCollection, SubjectCollection,
} from './interfaces/collections';

export class InMemoryCollection implements Collection<any> {
  private store = new Map<string, any>();

  async get(id: string) {
    return this.store.has(id) ? { ...this.store.get(id) } : null;
  }

  async set(id: string, data: any) {
    this.store.set(id, { ...data });
  }

  async update(id: string, data: Partial<any>) {
    const existing = this.store.get(id);
    if (existing) this.store.set(id, { ...existing, ...data });
  }

  async delete(id: string) {
    this.store.delete(id);
  }

  async list(_query?: any): Promise<any[]> {
    return Array.from(this.store.values()).map(v => JSON.parse(JSON.stringify(v)));
  }

  clear() { this.store.clear(); }
  entries() { return this.store; }
}

export class InMemoryUserCollection extends InMemoryCollection implements UserCollection {}
export class InMemoryGradeCollection extends InMemoryCollection implements GradeCollection {}
export class InMemoryNotificationCollection extends InMemoryCollection implements NotificationCollection {}
export class InMemoryAssignmentCollection extends InMemoryCollection implements AssignmentCollection {}
export class InMemoryAttendanceCollection extends InMemoryCollection implements AttendanceCollection {}
export class InMemoryConceptCollection extends InMemoryCollection implements ConceptCollection {}
export class InMemoryTextbookCollection extends InMemoryCollection implements TextbookCollection {}
export class InMemoryChapterCollection extends InMemoryCollection implements ChapterCollection {}
export class InMemoryClassCollection extends InMemoryCollection implements ClassCollection {}
export class InMemorySubjectCollection extends InMemoryCollection implements SubjectCollection {}
