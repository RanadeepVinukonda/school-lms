import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../services/supabase';

function sb() { return getSupabaseAdmin()!; }

// ponytail: firestore_docs JSONB for ad-hoc collections; typed tables for pipeline data
// Column name conversion bridges JS camelCase ↔ SQL snake_case

// ── Typed table column sets (SQL column names, snake_case) ──
const TYPED_TABLES: Record<string, Set<string>> = {
  users: new Set(['id','email','display_name','role','phone_number','photo_url','is_active','class_ids','class_id','student_id','roll_no','academic_year','children_ids','password','streak_count','last_active_date','language','created_at','updated_at']),
  textbooks: new Set(['id','title','subject_id','class_id','teacher_id','description','cover_image','storage_path','pdf_url','status','chapter_count','total_concepts','completed_concepts','failure_reason','logs','processing_stage','processing_progress','created_at','updated_at']),
  chapters: new Set(['id','textbook_id','title','order','summary','created_at','updated_at','data']),
  concepts: new Set(['id','chapter_id','textbook_id','title','order','notes','video_links','created_at','updated_at','data']),
  concept_notes: new Set(['id','concept_id','textbook_id','chapter_id','summary','notes','key_points','formulas','examples','learning_objectives','embedding','updated_at','data']),
  concept_videos: new Set(['id','concept_id','textbook_id','chapter_id','video_id','title','description','channel','thumbnail','duration','score','embedding','created_at','data']),
  concept_questions: new Set(['id','concept_id','textbook_id','chapter_id','question','type','difficulty','options','answer','explanation','passage_text','created_at','data']),
  concept_resources: new Set(['id','concept_id','textbook_id','chapter_id','title','url','source','description','score','embedding','created_at','data']),
  processing_jobs: new Set(['id','textbook_id','status','progress','current_step','error','updated_at','data']),
  raw_pages: new Set(['id','textbook_id','page_num','text','created_at','data']),
};

function isTyped(c: string) { return c in TYPED_TABLES; }
function table(c: string) { return isTyped(c) ? c : 'firestore_docs'; }
function typedCols(c: string) { return TYPED_TABLES[c]; }

// ── camelCase ↔ snake_case with acronym support ──
const ACRONYMS = new Set(['url','pdf','id','html','css','json','xml','api','ui','ux','aws','http','https','sql','smtp']);

function camelToSnake(s: string): string {
  // Handle acronyms: PDFUrl → pdf_url, photoURL → photo_url
  let r = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
  r = r.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return r.toLowerCase();
}

function snakeToCamel(s: string): string {
  const parts = s.split('_');
  if (parts.length === 1) return parts[0];
  let r = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const w = parts[i];
    r += ACRONYMS.has(w) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1));
  }
  return r;
}

// ponytail: manual overrides for non-deterministic conversions
const CAMEL_OVERRIDES: Record<string, string> = { photo_url: 'photoURL', pdf_url: 'pdfUrl', cover_image: 'coverImage', storage_path: 'storagePath' };

function toJsCol(tableName: string, sqlKey: string): string {
  if (sqlKey === 'data' || sqlKey === 'id' || sqlKey === 'created_at' || sqlKey === 'updated_at') return sqlKey;
  return CAMEL_OVERRIDES[sqlKey] || snakeToCamel(sqlKey);
}

function toSqlCol(c: string, jsKey: string): string {
  if (typedCols(c)?.has(jsKey)) return jsKey; // already snake_case matching column
  return camelToSnake(jsKey);
}

function buildDocData(row: Record<string, any>, c: string): Record<string, any> {
  const jsonb = row.data || {};
  const result: Record<string, any> = { ...jsonb };
  for (const [k, v] of Object.entries(row)) {
    if (k === 'data') continue;
    const jsKey = toJsCol(c, k);
    if (jsKey !== k || !(jsKey in jsonb)) result[jsKey] = v;
  }
  return result;
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

// ── Snapshots ──
class DocSnap {
  constructor(
    public readonly id: string,
    private _data: Record<string, any> | undefined,
    public readonly ref: DocRef,
  ) {}
  get exists() { return this._data !== undefined; }
  data() { return this._data; }
}

class QuerySnap {
  constructor(public readonly docs: DocSnap[]) {}
  get size() { return this.docs.length; }
  get empty() { return this.docs.length === 0; }
  forEach(fn: (d: DocSnap) => void) { this.docs.forEach(fn); }
}

class AggSnap {
  constructor(private c: number) {}
  data() { return { count: this.c }; }
}

// ── Document Reference ──
class DocRef {
  constructor(public readonly col: string, public readonly id: string) {}

  async get(): Promise<DocSnap> {
    const sup = sb();
    if (isTyped(this.col)) {
      const { data, error } = await sup.from(table(this.col)).select('*').eq('id', this.id).maybeSingle();
      if (error) throw error;
      return new DocSnap(this.id, data ? buildDocData(data, this.col) : undefined, this);
    }
    const { data, error } = await sup.from('firestore_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    if (error) throw error;
    return new DocSnap(this.id, (data as any)?.data ?? undefined, this);
  }

  async set(data: Record<string, any>): Promise<void> {
    const sup = sb();
    if (isTyped(this.col)) {
      const cols = typedCols(this.col)!;
      const sql: Record<string, any> = { id: this.id };
      for (const [k, v] of Object.entries(data)) {
        const sk = toSqlCol(this.col, k);
        if (cols.has(sk)) sql[sk] = v;
        else { const d = (sql.data as Record<string, any>) || {}; d[k] = v; sql.data = d; }
      }
      const { error } = await sup.from(table(this.col)).upsert(sql as any);
      if (error) throw error;
      return;
    }
    const { error } = await sup.from('firestore_docs').upsert({
      collection: this.col, doc_id: this.id, data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  async update(data: Record<string, any>): Promise<void> {
    const sup = sb();
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
        sqlUpdate.updated_at = new Date().toISOString();
        if (Object.keys(newJsonb).length > 0) sqlUpdate.data = newJsonb;
        if (!sqlUpdate.data) sqlUpdate.data = currJsonb;
        const { error } = await sup.from(table(this.col)).update(sqlUpdate as any).eq('id', this.id);
        if (error) throw error;
      }
      return;
    }

    const { data: existing } = await sup.from('firestore_docs').select('data')
      .eq('collection', this.col).eq('doc_id', this.id).maybeSingle();
    const merged: Record<string, any> = existing ? { ...(existing as any).data } : {};
    for (const [k, v] of Object.entries(n)) merged[k] = v;
    for (const i of inc) merged[i.f] = ((merged[i.f] as number) || 0) + i.a;
    for (const u of au) { const a = (merged[u.f] as unknown[]) || []; merged[u.f] = [...new Set([...a, ...u.i])]; }
    for (const r of ar) { const a = (merged[r.f] as unknown[]) || []; merged[r.f] = a.filter((x: unknown) => !r.i.includes(x)); }

    const { error } = await sup.from('firestore_docs').upsert({
      collection: this.col, doc_id: this.id, data: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,doc_id' });
    if (error) throw error;
  }

  async delete(): Promise<void> {
    const sup = sb();
    const { error } = isTyped(this.col)
      ? await sup.from(table(this.col)).delete().eq('id', this.id)
      : await sup.from('firestore_docs').delete().eq('collection', this.col).eq('doc_id', this.id);
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
class ColRef {
  private _pdoc: { id: string; fk: string } | null = null;
  constructor(private _n: string, pd?: DocRef, fk?: string) {
    if (pd && fk) this._pdoc = { id: pd.id, fk };
  }
  get name() { return this._n; }

  doc(id?: string): DocRef { return new DocRef(this._n, id ?? uuidv4()); }

  async add(data: Record<string, any>): Promise<DocRef> {
    const id = uuidv4();
    const r = new DocRef(this._n, id);
    await r.set(data);
    return r;
  }

  where(f: string, o: string, v: unknown): Query { return new Query(this._n, this._pdoc).where(f, o, v); }
  orderBy(f: string, d?: 'asc' | 'desc'): Query { return new Query(this._n, this._pdoc).orderBy(f, d); }
  limit(n: number): Query { return new Query(this._n, this._pdoc).limit(n); }
  offset(n: number): Query { return new Query(this._n, this._pdoc).offset(n); }
  count(): CountQ { return new CountQ(this._n, this._pdoc); }
  async get(): Promise<QuerySnap> { return new Query(this._n, this._pdoc).get(); }
  get firestore() { return fsObj; }
}

// ── Query ──
export class Timestamp {
  constructor(public seconds: number = Math.floor(Date.now() / 1000), public nanoseconds: number = 0) {}
  static now() { return new Timestamp(); }
  static fromDate(date: Date) { return new Timestamp(Math.floor(date.getTime() / 1000), 0); }
  toDate() { return new Date(this.seconds * 1000); }
}

export class Query {
  protected _w: Array<{ f: string; o: string; v: unknown }> = [];
  protected _ob: { f: string; d: 'asc' | 'desc' } | null = null;
  protected _lim: number | null = null;
  protected _off: number | null = null;

  constructor(protected _n: string, protected _pdoc: { id: string; fk: string } | null = null) {}
  protected get typed() { return isTyped(this._n); }

  where(f: string, o: string, v: unknown): this { this._w.push({ f, o, v }); return this; }
  orderBy(f: string, d: 'asc' | 'desc' = 'asc'): this { this._ob = { f, d }; return this; }
  limit(n: number): this { this._lim = n; return this; }
  offset(n: number): this { this._off = n; return this; }

  count(): CountQ {
    return new CountQ(this._n, this._pdoc, [...this._w], this._ob ? { ...this._ob } : null);
  }

  async get(): Promise<QuerySnap> {
    const sup = sb();
    let q: any;

    if (this.typed) {
      q = sup.from(table(this._n)).select('*');
      if (this._pdoc) q = q.eq(this._pdoc.fk, this._pdoc.id);
    } else {
      q = sup.from('firestore_docs').select('*').eq('collection', this._n);
      if (this._pdoc) q = q.contains('data', { [this._pdoc.fk]: this._pdoc.id });
    }

    for (const w of this._w) {
      const field = this.typed ? camelToSnake(w.f) : w.f;
      switch (w.o) {
        case '==': q = this.typed ? q.eq(field, w.v) : q.contains('data', { [field]: w.v }); break;
        case '>=': q = this.typed ? q.gte(field, w.v) : q.filter('data->>' + field, 'gte', w.v); break;
        case '<=': q = this.typed ? q.lte(field, w.v) : q.filter('data->>' + field, 'lte', w.v); break;
        case '>': q = this.typed ? q.gt(field, w.v) : q.filter('data->>' + field, 'gt', w.v); break;
        case '<': q = this.typed ? q.lt(field, w.v) : q.filter('data->>' + field, 'lt', w.v); break;
        case 'array-contains': q = this.typed ? q.contains(field, [w.v]) : q.contains('data', { [field]: [w.v] }); break;
        case 'array-contains-any': q = this.typed ? q.overlaps(field, w.v) : q.overlaps('data', { [field]: w.v }); break;
        case 'in': {
          if (this.typed) { q = q.in(field, w.v as unknown[]); break; }
          const arr = w.v as unknown[];
          q = q.or(arr.map(x => `data @> '{"${field}": ${JSON.stringify(x)}}'`).join(','));
          break;
        }
        case 'not-in': {
          if (this.typed) { q = q.not(field, 'in', w.v); break; }
          const arr = w.v as unknown[];
          q = q.or(arr.map(x => `not data @> '{"${field}": ${JSON.stringify(x)}}'`).join(','));
          break;
        }
        default: q = this.typed ? q.filter(field, w.o, w.v) : q.filter('data->>' + field, w.o, w.v);
      }
    }

    if (this._ob) {
      let orderField = this.typed ? camelToSnake(this._ob.f) : this._ob.f;
      if (!this.typed) {
        if (orderField === 'createdAt') orderField = 'created_at';
        else if (orderField === 'updatedAt') orderField = 'updated_at';
      }
      q = q.order(orderField, { ascending: this._ob.d === 'asc' });
    }
    if (this._lim !== null && this._off !== null) q = q.range(this._off, this._off + this._lim - 1);
    else if (this._lim !== null) q = q.limit(this._lim);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return new QuerySnap([]);

    if (this.typed) {
      return new QuerySnap((data as any[]).map((r: any) =>
        new DocSnap(r.id, buildDocData(r, this._n), new DocRef(this._n, r.id))
      ));
    }
    return new QuerySnap((data as any[]).map((r: any) =>
      new DocSnap(r.doc_id, r.data, new DocRef(this._n, r.doc_id))
    ));
  }
}

// ── Count Query ──
class CountQ {
  constructor(
    private _n: string,
    private _pdoc: { id: string; fk: string } | null = null,
    private _w: Array<{ f: string; o: string; v: unknown }> = [],
    private _ob: { f: string; d: string } | null = null,
  ) {}

  async get(): Promise<AggSnap> {
    const sup = sb();
    let q: any;

    if (isTyped(this._n)) {
      q = sup.from(table(this._n)).select('*', { count: 'exact', head: true });
      if (this._pdoc) q = q.eq(this._pdoc.fk, this._pdoc.id);
    } else {
      q = sup.from('firestore_docs').select('*', { count: 'exact', head: true }).eq('collection', this._n);
      if (this._pdoc) q = q.contains('data', { [this._pdoc.fk]: this._pdoc.id });
    }

    for (const w of this._w) {
      const field = isTyped(this._n) ? camelToSnake(w.f) : w.f;
      switch (w.o) {
        case '==': q = isTyped(this._n) ? q.eq(field, w.v) : q.contains('data', { [field]: w.v }); break;
        case '>=': q = isTyped(this._n) ? q.gte(field, w.v) : q.filter('data->>' + field, 'gte', w.v); break;
        case '<=': q = isTyped(this._n) ? q.lte(field, w.v) : q.filter('data->>' + field, 'lte', w.v); break;
        case '<': q = isTyped(this._n) ? q.lt(field, w.v) : q.filter('data->>' + field, 'lt', w.v); break;
        default: q = isTyped(this._n) ? q.filter(field, w.o, w.v) : q.filter('data->>' + field, w.o, w.v);
      }
    }

    const { count, error } = await q;
    if (error) throw error;
    return new AggSnap(count || 0);
  }
}

// ── WriteBatch ──
class WB {
  private _ops: Array<{ t: 's' | 'c' | 'u' | 'd'; r: DocRef; d?: Record<string, any> }> = [];
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

// ponytail: no atomic transaction — read current state, apply writes sequentially
class Tx {
  private _w: Array<{ t: 's' | 'u' | 'd'; r: DocRef; d?: Record<string, any> }> = [];

  async get(r: DocRef): Promise<DocSnap> { return r.get(); }
  set(r: DocRef, d: Record<string, any>) { this._w.push({ t: 's', r, d }); }
  update(r: DocRef, d: Record<string, any>) { this._w.push({ t: 'u', r, d }); }
  delete(r: DocRef) { this._w.push({ t: 'd', r }); }

  async commit(): Promise<void> {
    for (const w of this._w) {
      switch (w.t) { case 's': await w.r.set(w.d!); break; case 'u': await w.r.update(w.d!); break; case 'd': await w.r.delete(); break; }
    }
  }
}

const fsObj = {
  batch: () => new WB(),
  runTransaction: async <T>(fn: (t: Tx) => Promise<T>): Promise<T> => {
    const t = new Tx();
    const r = await fn(t);
    await t.commit();
    return r;
  },
  collection: (n: string) => new ColRef(n),
  doc: (p: string) => { const ps = p.split('/'); if (ps.length < 2) throw new Error(`Invalid path: ${p}`); return new DocRef(ps[0], ps.slice(1).join('/')); },
};

export function getDb(): any { return fsObj; }
export function getCollection(n: string): any { return new ColRef(n); }

// ── Named collection shortcuts ──
export const collections = {
  users: () => getCollection('users'),
  courses: () => getCollection('courses'),
  lessons: () => getCollection('lessons'),
  assignments: () => getCollection('assignments'),
  submissions: () => getCollection('submissions'),
  quizzes: () => getCollection('quizzes'),
  quizAttempts: () => getCollection('quizAttempts'),
  exams: () => getCollection('exams'),
  examAttempts: () => getCollection('examAttempts'),
  grades: () => getCollection('grades'),
  conversations: () => getCollection('conversations'),
  messages: () => getCollection('messages'),
  notifications: () => getCollection('notifications'),
  classes: () => getCollection('classes'),
  subjects: () => getCollection('subjects'),
  activityLogs: () => getCollection('activityLogs'),
  settings: () => getCollection('settings'),
  uploads: () => getCollection('uploads'),
  enrollment: () => getCollection('enrollment'),
  tokens: () => getCollection('tokens'),
  auditLogs: () => getCollection('auditLogs'),
  timetable: () => getCollection('timetable'),
  textbooks: () => getCollection('textbooks'),
  teacherClassSubject: () => getCollection('teacherClassSubject'),
  teacherVideos: () => getCollection('teacherVideos'),
  assignmentSubmissions: () => getCollection('assignmentSubmissions'),
  quizV2: () => getCollection('quizV2'),
  quizAttemptV2: () => getCollection('quizAttemptV2'),
  assignmentV2: () => getCollection('assignmentV2'),
  assignmentSubmissionV2: () => getCollection('assignmentSubmissionV2'),
  examV2: () => getCollection('examV2'),
  examAttemptV2: () => getCollection('examAttemptV2'),
  questionBank: () => getCollection('questionBank'),
  questionPapers: () => getCollection('questionPapers'),
  testTemplates: () => getCollection('testTemplates'),
  testSchedule: () => getCollection('testSchedule'),
  academicYears: () => getCollection('academicYears'),
  gamificationProfiles: () => getCollection('gamificationProfiles'),
  gamificationTransactions: () => getCollection('gamificationTransactions'),
  gamificationDailyChallenges: () => getCollection('gamificationDailyChallenges'),
  mindmaps: () => getCollection('mindmaps'),
  virtualLabs: () => getCollection('virtualLabs'),
  virtualLabProgress: () => getCollection('virtualLabProgress'),
  attendance: () => getCollection('attendance'),
  feeSchedules: () => getCollection('feeSchedules'),
  payments: () => getCollection('payments'),
  codingProjects: () => getCollection('codingProjects'),
  streamProjects: () => getCollection('streamProjects'),
  prePrimaryLessons: () => getCollection('prePrimaryLessons'),
  flashcards: () => getCollection('flashcards'),
  stories: () => getCollection('stories'),
  tracingActivities: () => getCollection('tracingActivities'),
  prePrimaryProgress: () => getCollection('prePrimaryProgress'),
  nepQuestions: () => getCollection('nepQuestions'),
  gradingRubrics: () => getCollection('gradingRubrics'),
};
