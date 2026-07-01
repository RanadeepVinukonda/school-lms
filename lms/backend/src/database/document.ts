import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../services/supabase';
import {
  isTyped,
  table,
  typedCols,
  toSqlCol,
  buildDocData,
} from './schema';
import { Timestamp, getDb } from './adapter';
import { Query, CountQ } from './query-builder';

// ── Snapshots ──
export class DocSnap {
  constructor(
    public readonly id: string,
    /** @internal */ _data: Record<string, any> | undefined,
    public readonly ref: DocRef,
  ) { this.__data = _data; }
  /** @internal */ __data: Record<string, any> | undefined;
  get exists() { return this.__data !== undefined; }
  data(): any { return this.__data; }
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

function extractFv(data: Record<string, any>) {
  const n: Record<string, any> = {};
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

// ── Document Reference ──
export class DocRef {
  constructor(public readonly col: string, public readonly id: string) {}

  async get(): Promise<DocSnap> {
    const sup = getSupabaseAdmin()!;
    if (isTyped(this.col)) {
      const { data, error } = await sup.from(table(this.col)).select('*').eq('id', this.id).maybeSingle();
      if (error) throw error;
      return new DocSnap(this.id, data ? buildDocData(data, this.col) : undefined, this);
    }
    const { data, error } = await sup.from('nosql_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    if (error) throw error;
    return new DocSnap(this.id, (data as any)?.data ?? undefined, this);
  }

  async set(data: Record<string, any>): Promise<void> {
    const sup = getSupabaseAdmin()!;
    if (isTyped(this.col)) {
      const cols = typedCols(this.col)!;
      const sql: Record<string, any> = { id: this.id };
      for (const [k, v] of Object.entries(data)) {
        const sk = toSqlCol(this.col, k);
        if (cols.has(sk)) sql[sk] = v;
        else if (cols.has('data')) { 
          const d = (sql.data as Record<string, any>) || {}; 
          d[k] = v; 
          sql.data = d; 
        }
      }
      const { error } = await sup.from(table(this.col)).upsert(sql as any);
      if (error) throw error;
      return;
    }
    const { error } = await sup.from('nosql_docs').upsert({
      collection: this.col, doc_id: this.id, data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  async update(data: Record<string, any>): Promise<void> {
    const sup = getSupabaseAdmin()!;
    const { n, inc, au, ar } = extractFv(data);

    if (isTyped(this.col)) {
      const cols = typedCols(this.col)!;
      const { data: row } = await sup.from(table(this.col)).select('*').eq('id', this.id).maybeSingle();
      const current = (row || {}) as Record<string, any>;
      const currJsonb = (current.data as Record<string, any>) || {};
      const newJsonb: Record<string, any> = { ...currJsonb };
      const sqlUpdate: Record<string, any> = {};

      const apply = (k: string, v: unknown) => {
        const sk = toSqlCol(this.col, k);
        if (cols.has(sk)) sqlUpdate[sk] = v;
        else newJsonb[k] = v;
      };

      for (const [k, v] of Object.entries(n)) apply(k, v);
      for (const i of inc) { const cur = newJsonb[i.f] as number || current[toSqlCol(this.col, i.f)] as number || 0; apply(i.f, cur + i.a); }
      for (const u of au) { const arr = (newJsonb[u.f] as unknown[]) || (current[toSqlCol(this.col, u.f)] as unknown[]) || []; apply(u.f, [...new Set([...arr, ...u.i])]); }
      for (const r of ar) { const arr = (newJsonb[r.f] as unknown[]) || []; apply(r.f, arr.filter((x: unknown) => !r.i.includes(x))); }

      if (Object.keys(sqlUpdate).length > 0) {
        const uCol = cols.has('updatedAt') ? 'updatedAt' : 'updated_at';
        sqlUpdate[uCol] = new Date().toISOString();
        if (cols.has('data')) {
          if (Object.keys(newJsonb).length > 0) sqlUpdate.data = newJsonb;
          if (!sqlUpdate.data) sqlUpdate.data = currJsonb;
        }
        const { error } = await sup.from(table(this.col)).update(sqlUpdate as any).eq('id', this.id);
        if (error) throw error;
      }
      return;
    }

    const { data: existing } = await sup.from('nosql_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    const merged: Record<string, any> = existing ? { ...(existing as any).data } : {};
    for (const [k, v] of Object.entries(n)) merged[k] = v;
    for (const i of inc) merged[i.f] = ((merged[i.f] as number) || 0) + i.a;
    for (const u of au) { const a = (merged[u.f] as unknown[]) || []; merged[u.f] = [...new Set([...a, ...u.i])]; }
    for (const r of ar) { const a = (merged[r.f] as unknown[]) || []; merged[r.f] = a.filter((x: unknown) => !r.i.includes(x)); }

    const { error } = await sup.from('nosql_docs').upsert({
      collection: this.col, doc_id: this.id, data: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  async delete(): Promise<void> {
    const sup = getSupabaseAdmin()!;
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
  /** @internal */ _pdoc: { id: string; fk: string } | null = null;
  /** @internal */ _n: string;
  constructor(_n: string, pd?: DocRef, fk?: string) {
    this._n = _n;
    if (pd && fk) this._pdoc = { id: pd.id, fk };
  }
  get name() { return this._n; }

  doc(id?: string): DocRef { return new DocRef(this._n, id ?? randomUUID()); }

  async add(data: Record<string, any>): Promise<DocRef> {
    const id = randomUUID();
    const r = new DocRef(this._n, id);
    await r.set(data);
    return r;
  }

  where(f: string, o: string, v: unknown): Query { return new Query(this._n, this._pdoc).where(f, o, v); }
  orderBy(f: string, d?: 'asc' | 'desc'): Query { return new Query(this._n, this._pdoc).orderBy(f, d); }
  limit(n: number): Query { return new Query(this._n, this._pdoc).limit(n); }
  offset(n: number): Query { return new Query(this._n, this._pdoc).offset(n); }
  count(): CountQ { return new CountQ(this._n, this._pdoc); }
  async get(): Promise<import('./adapter').QuerySnap> { return new Query(this._n, this._pdoc).get(); }
  get firestore() { return getDb(); }
}

// ── WriteBatch ──
export class WB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _ops: Array<{ t: 's' | 'c' | 'u' | 'd'; r: DocRef; d?: Record<string, any> }> = [];
  set(r: DocRef, d: Record<string, any>) { this._ops.push({ t: 's', r, d }); return this; }
  create(r: DocRef, d: Record<string, any>) { this._ops.push({ t: 'c', r, d }); return this; }
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
