import { Collection } from './interfaces/collections';
import { getCollection } from './adapter';
import {
  UserCollection,
  GradeCollection,
  NotificationCollection,
  AssignmentCollection,
  AttendanceCollection,
  ConceptCollection,
  TextbookCollection,
  ChapterCollection,
  ClassCollection,
  SubjectCollection
} from './interfaces/collections';

export class BaseSupabaseCollection implements Collection<any> {
  constructor(private name: string) {}

  async get(id: string): Promise<any | null> {
    const doc = await getCollection(this.name).doc(id).get();
    return doc.exists ? doc.data() : null;
  }

  async set(id: string, data: any): Promise<void> {
    await getCollection(this.name).doc(id).set(data);
  }

  async update(id: string, data: Partial<any>): Promise<void> {
    await getCollection(this.name).doc(id).update(data);
  }

  async delete(id: string): Promise<void> {
    await getCollection(this.name).doc(id).delete();
  }

  async list(query?: any): Promise<any[]> {
    let q: ReturnType<typeof getCollection> | import('./query-builder').Query = getCollection(this.name);
    if (query) {
      if (Array.isArray(query.where)) {
        for (const w of query.where) {
          q = q.where(w.field, w.op, w.value);
        }
      }
      if (query.orderBy) {
        q = q.orderBy(query.orderBy.field, query.orderBy.direction);
      }
      if (typeof query.limit === 'number') {
        q = q.limit(query.limit);
      }
      if (typeof query.offset === 'number') {
        q = q.offset(query.offset);
      }
    }
    const snap = await q.get();
    const list: any[] = [];
    snap.forEach((d: any) => {
      list.push(d.data());
    });
    return list;
  }
}

export class SupabaseUserCollection extends BaseSupabaseCollection implements UserCollection {
  constructor() { super('users'); }
}

export class SupabaseGradeCollection extends BaseSupabaseCollection implements GradeCollection {
  constructor() { super('grades'); }
}

export class SupabaseNotificationCollection extends BaseSupabaseCollection implements NotificationCollection {
  constructor() { super('notifications'); }
}

export class SupabaseAssignmentCollection extends BaseSupabaseCollection implements AssignmentCollection {
  constructor() { super('assignments'); }
}

export class SupabaseAttendanceCollection extends BaseSupabaseCollection implements AttendanceCollection {
  constructor() { super('attendance'); }
}

export class SupabaseConceptCollection extends BaseSupabaseCollection implements ConceptCollection {
  constructor() { super('concepts'); }
}

export class SupabaseTextbookCollection extends BaseSupabaseCollection implements TextbookCollection {
  constructor() { super('textbooks'); }
}

export class SupabaseChapterCollection extends BaseSupabaseCollection implements ChapterCollection {
  constructor() { super('chapters'); }
}

export class SupabaseClassCollection extends BaseSupabaseCollection implements ClassCollection {
  constructor() { super('classes'); }
}

export class SupabaseSubjectCollection extends BaseSupabaseCollection implements SubjectCollection {
  constructor() { super('subjects'); }
}
