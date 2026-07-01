import { getSupabaseAdmin } from '../services/supabase';
import { isTyped, table, toSqlCol, buildDocData } from './schema';
import { DocSnap, QuerySnap, AggSnap, DocRef } from './adapter';

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
    const sup = getSupabaseAdmin()!;
    let q: any;

    if (this.typed) {
      q = sup.from(table(this._n)).select('*');
      if (this._pdoc) q = q.eq(this._pdoc.fk, this._pdoc.id);
    } else {
      q = sup.from('nosql_docs').select('*').eq('collection', this._n);
      if (this._pdoc) q = q.contains('data', { [this._pdoc.fk]: this._pdoc.id });
    }

    for (const w of this._w) {
      const field = this.typed ? toSqlCol(this._n, w.f) : w.f;
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
      let orderField = this.typed ? toSqlCol(this._n, this._ob.f) : this._ob.f;
      if (!this.typed) {
        if (orderField === 'createdAt') orderField = 'created_at';
        else if (orderField === 'updatedAt') orderField = 'updated_at';
        else orderField = `data->>${orderField}`;
      }
      q = q.order(orderField, { ascending: this._ob.d === 'asc', nullsFirst: false });
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

export class CountQ {
  constructor(
    private _n: string,
    private _pdoc: { id: string; fk: string } | null = null,
    private _w: Array<{ f: string; o: string; v: unknown }> = [],
    private _ob: { f: string; d: string } | null = null,
  ) {}

  async get(): Promise<AggSnap> {
    const sup = getSupabaseAdmin()!;
    let q: any;

    if (isTyped(this._n)) {
      q = sup.from(table(this._n)).select('*', { count: 'exact', head: true });
      if (this._pdoc) q = q.eq(this._pdoc.fk, this._pdoc.id);
    } else {
      q = sup.from('nosql_docs').select('*', { count: 'exact', head: true }).eq('collection', this._n);
      if (this._pdoc) q = q.contains('data', { [this._pdoc.fk]: this._pdoc.id });
    }

    for (const w of this._w) {
      const field = isTyped(this._n) ? toSqlCol(this._n, w.f) : w.f;
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
