import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../services/supabase';
import { DbAdapter } from './interfaces/db-adapter';
import { Transaction } from './interfaces/transaction';
import { isTyped, table, typedCols, toSqlCol, buildDocData, toJsCol } from './schema';

export { Query, CountQ } from './query-builder';
export { isTyped, table, toSqlCol, buildDocData, toJsCol } from './schema';
export { collections } from './registry';

function sb() { return getSupabaseAdmin()!; }

// ── FieldValue sentinels ──
class FvInc { constructor(readonly amount: number) {} }
class FvArr { constructor(readonly items: unknown[]) {} }
class FvRem { constructor(readonly items: unknown[]) {} }

export const FieldValue = {
  increment: (n: number) => new FvInc(n),
  arrayUnion: (...i: unknown[]) => new FvArr(i),
  arrayRemove: (...i: unknown[]) => new FvRem(i),
  serverTimestamp: () => new Date().toISOString(),
  deleteField: () => '__DELETE__' as const,
};

function extractFv(data: Record<string, unknown>) {
  const n: Record<string, unknown> = {};
  const inc: Array<{ f: string; a: number }> = [];
  const au: Array<{ f: string; i: unknown[] }> = [];
  const ar: Array<{ f: string; i: unknown[] }> = [];
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof FvInc) inc.push({ f: k, a: v.amount });
    else if (v instanceof FvArr) au.push({ f: k, i: v.items });
    else if (v instanceof FvRem) ar.push({ f: k, i: v.items });
    else if (v !== undefined) n[k] = v;
  }
  return { n, inc, au, ar };
}

// ── Snapshots ──
export class DocSnap {
  constructor(
    public readonly id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _data: Record<string, any> | undefined,
    public readonly ref: DocRef,
  ) {}
  get exists() { return this._data !== undefined; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(): any { return this._data; }
}

export class QuerySnap {
  constructor(public readonly docs: DocSnap[]) {}
  get size() { return this.docs.length; }
  get empty() { return this.docs.length === 0; }
  forEach(fn: (d: DocSnap) => void) { this.docs.forEach(fn); }
}

export class AggSnap {
  constructor(private c: number) {}
  data() { return { count: this.c }; }
}

export class Timestamp {
  constructor(public seconds: number = Math.floor(Date.now() / 1000), public nanoseconds: number = 0) {}
  static now() { return new Timestamp(); }
  static fromDate(date: Date) { return new Timestamp(Math.floor(date.getTime() / 1000), 0); }
  toDate() { return new Date(this.seconds * 1000); }
}

// ── Document Reference ──
export class DocRef {
  constructor(public readonly col: string, public readonly id: string) {}

  async get(): Promise<DocSnap> {
    const sup = sb();
    if (isTyped(this.col)) {
      const { data, error } = await sup.from(table(this.col)).select('*').eq('id', this.id).maybeSingle();
      if (error) throw error;
      return new DocSnap(this.id, data ? buildDocData(data as Record<string, unknown>, this.col) : undefined, this);
    }
    const { data, error } = await sup.from('nosql_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    if (error) throw error;
    return new DocSnap(this.id, (data as Record<string, unknown> | null)?.data as Record<string, unknown> ?? undefined, this);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(data: Record<string, any>, _options?: { merge?: boolean }): Promise<void> {
    const sup = sb();
    if (isTyped(this.col)) {
      const cols = typedCols(this.col)!;
      const sql: Record<string, unknown> = { id: this.id };
      for (const [k, v] of Object.entries(data)) {
        const sk = toSqlCol(this.col, k);
        if (cols.has(sk)) sql[sk] = v;
        else if (cols.has('data')) {
          const d = (sql.data as Record<string, unknown>) || {};
          d[k] = v;
          sql.data = d;
        }
      }
      const { error } = await sup.from(table(this.col)).upsert(sql as never);
      if (error) throw error;
      return;
    }
    const { error } = await sup.from('nosql_docs').upsert({
      collection: this.col, doc_id: this.id, data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(data: Record<string, any>): Promise<void> {
    const sup = sb();
    const { n, inc, au, ar } = extractFv(data);

    if (isTyped(this.col)) {
      const cols = typedCols(this.col)!;
      const { data: row } = await sup.from(table(this.col)).select('*').eq('id', this.id).maybeSingle();
      const current = (row || {}) as Record<string, unknown>;
      const currJsonb = (current.data as Record<string, unknown>) || {};
      const newJsonb: Record<string, unknown> = { ...currJsonb };
      const sqlUpdate: Record<string, unknown> = {};

      const apply = (k: string, v: unknown) => {
        const sk = toSqlCol(this.col, k);
        if (cols.has(sk)) sqlUpdate[sk] = v;
        else newJsonb[k] = v;
      };

      for (const [k, v] of Object.entries(n)) apply(k, v);
      for (const i of inc) {
        const cur = (newJsonb[i.f] as number) || (current[toSqlCol(this.col, i.f)] as number) || 0;
        apply(i.f, cur + i.a);
      }
      for (const u of au) {
        const arr = (newJsonb[u.f] as unknown[]) || (current[toSqlCol(this.col, u.f)] as unknown[]) || [];
        apply(u.f, [...new Set([...arr, ...u.i])]);
      }
      for (const r of ar) {
        const arr = (newJsonb[r.f] as unknown[]) || [];
        apply(r.f, arr.filter((x: unknown) => !r.i.includes(x)));
      }

      if (Object.keys(sqlUpdate).length > 0) {
        const uCol = cols.has('updatedAt') ? 'updatedAt' : 'updated_at';
        sqlUpdate[uCol] = new Date().toISOString();
        if (cols.has('data')) {
          sqlUpdate.data = Object.keys(newJsonb).length > 0 ? newJsonb : currJsonb;
        }
        const { error } = await sup.from(table(this.col)).update(sqlUpdate as never).eq('id', this.id);
        if (error) throw error;
      }
      return;
    }

    const { data: existing } = await sup.from('nosql_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    const merged: Record<string, unknown> = existing ? { ...(existing as Record<string, unknown>).data as Record<string, unknown> } : {};
    for (const [k, v] of Object.entries(n)) merged[k] = v;
    for (const i of inc) merged[i.f] = ((merged[i.f] as number) || 0) + i.a;
    for (const u of au) {
      const a = (merged[u.f] as unknown[]) || [];
      merged[u.f] = [...new Set([...a, ...u.i])];
    }
    for (const r of ar) {
      const a = (merged[r.f] as unknown[]) || [];
      merged[r.f] = a.filter((x: unknown) => !r.i.includes(x));
    }

    const { error } = await sup.from('nosql_docs').upsert({
      collection: this.col, doc_id: this.id, data: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  async delete(): Promise<void> {
    const sup = sb();
    const { error } = isTyped(this.col)
      ? await sup.from(table(this.col)).delete().eq('id', this.id)
      : await sup.from('nosql_docs').delete().eq('collection', this.col).eq('doc_id', this.id);
    if (error) throw error;
  }

  collection(sub: string): ColRef {
    const SUB_FK: Record<string, Record<string, string>> = {
      textbooks: { chapters: 'textbook_id' },
      chapters: { concepts: 'chapter_id' },
      concepts: { questions: 'concept_id', notes: 'concept_id', videos: 'concept_id', resources: 'concept_id' },
      examAttempts: { proctoringLogs: 'exam_attempt_id' },
      quizV2: { quizAttemptV2: 'quiz_v2_id' },
      examV2: { examAttemptV2: 'exam_v2_id', proctoringLogs: 'exam_attempt_id' },
      assignmentV2: { assignmentSubmissionV2: 'assignment_v2_id' },
    };
    const fk = SUB_FK[this.col]?.[sub] ?? `${this.col.replace(/s$/, '')}_id`;
    return new ColRef(sub, this, fk);
  }
}

// ── Collection Reference ──
export class ColRef {
  private _pdoc: { id: string; fk: string } | null = null;
  constructor(private _n: string, pd?: DocRef, fk?: string) {
    if (pd && fk) this._pdoc = { id: pd.id, fk };
  }
  get name() { return this._n; }

  doc(id?: string): DocRef { return new DocRef(this._n, id ?? randomUUID()); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async add(data: Record<string, any>): Promise<DocRef> {
    const id = randomUUID();
    const r = new DocRef(this._n, id);
    await r.set(data);
    return r;
  }

  where(f: string, o: string, v: unknown): import('./query-builder').Query {
    const { Query } = require('./query-builder');
    return new Query(this._n, this._pdoc).where(f, o, v);
  }
  orderBy(f: string, d?: 'asc' | 'desc'): import('./query-builder').Query {
    const { Query } = require('./query-builder');
    return new Query(this._n, this._pdoc).orderBy(f, d);
  }
  limit(n: number): import('./query-builder').Query {
    const { Query } = require('./query-builder');
    return new Query(this._n, this._pdoc).limit(n);
  }
  offset(n: number): import('./query-builder').Query {
    const { Query } = require('./query-builder');
    return new Query(this._n, this._pdoc).offset(n);
  }
  count(): import('./query-builder').CountQ {
    const { CountQ } = require('./query-builder');
    return new CountQ(this._n, this._pdoc);
  }
  async get(): Promise<QuerySnap> {
    const { Query } = require('./query-builder');
    return new Query(this._n, this._pdoc).get();
  }
  get firestore() { return fsObj; }
}

// ── WriteBatch — sequential best-effort writes (no ACID) ──
class WB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _ops: Array<{ t: 's' | 'c' | 'u' | 'd'; r: DocRef; d?: Record<string, any> }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(r: DocRef, d: Record<string, any>, _options?: { merge?: boolean }) { this._ops.push({ t: 's', r, d }); return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(r: DocRef, d: Record<string, any>) { this._ops.push({ t: 'c', r, d }); return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(r: DocRef, d: Record<string, any>) { this._ops.push({ t: 'u', r, d }); return this; }
  delete(r: DocRef) { this._ops.push({ t: 'd', r }); return this; }
  async commit(): Promise<void> {
    for (const op of this._ops) {
      switch (op.t) {
        case 's': case 'c': await op.r.set(op.d!); break;
        case 'u': await op.r.update(op.d!); break;
        case 'd': await op.r.delete(); break;
      }
    }
  }
}

// Legacy Tx alias — use TransactionManager for ACID transactions
export { PseudoTx as Tx } from './transaction-manager';

const fsObj = {
  batch: () => new WB(),
  runTransaction: async <T>(fn: (t: import('./transaction-manager').PseudoTx) => Promise<T>): Promise<T> => {
    const { PseudoTx } = await import('./transaction-manager');
    const t = new PseudoTx();
    const r = await fn(t);
    await t.commit();
    return r;
  },
  collection: (n: string) => new ColRef(n),
  doc: (p: string) => {
    const ps = p.split('/');
    if (ps.length < 2) throw new Error(`Invalid path: ${p}`);
    return new DocRef(ps[0], ps.slice(1).join('/'));
  },
};

export function getDb(): typeof fsObj { return fsObj; }
export function getCollection(n: string): ColRef { return new ColRef(n); }

export class SupabaseDbAdapter implements DbAdapter {
  async get(collection: string, docId: string): Promise<unknown> {
    const snap = await new DocRef(collection, docId).get();
    return snap.data();
  }
  async set(collection: string, docId: string, data: unknown): Promise<void> {
    await new DocRef(collection, docId).set(data as Record<string, unknown>);
  }
  async update(collection: string, docId: string, data: unknown): Promise<void> {
    await new DocRef(collection, docId).update(data as Record<string, unknown>);
  }
  async delete(collection: string, docId: string): Promise<void> {
    await new DocRef(collection, docId).delete();
  }
  async list(collection: string, query?: Record<string, unknown>): Promise<unknown[]> {
    const { Query } = require('./query-builder');
    let q = new Query(collection);
    if (query) {
      if (Array.isArray(query.where)) {
        for (const w of query.where as Array<{ field: string; op: string; value: unknown }>) {
          q = q.where(w.field, w.op, w.value);
        }
      }
      if (query.orderBy) {
        const ob = query.orderBy as { field: string; direction?: string };
        q = q.orderBy(ob.field, ob.direction);
      }
      if (typeof query.limit === 'number') q = q.limit(query.limit);
      if (typeof query.offset === 'number') q = q.offset(query.offset);
    }
    const snap = await q.get();
    return snap.docs.map((d: DocSnap) => d.data());
  }
  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    const { PseudoTx } = await import('./transaction-manager');
    const t = new PseudoTx();
    const r = await updateFunction(t);
    await t.commit();
    return r;
  }
}
