import { getSupabaseAdmin } from '../services/supabase';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface DbRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  schoolId?: string;
  [key: string]: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListFilters {
  schoolId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

/**
 * Generic base service for standard CRUD operations.
 *
 * Subclasses override hooks (`beforeCreate`, `afterFind`, etc.) to add
 * domain-specific logic without duplicating query code.
 *
 * @example
 * ```ts
 * class StudentService extends BaseService<any> {
 *   protected table = 'students';
 *   protected softDelete = true;
 *
 *   protected async beforeCreate(dto: any) {
 *     // validate, enrich, etc.
 *   }
 * }
 * ```
 */
export abstract class BaseService<T extends DbRecord> {
  /** Supabase table name (required override). */
  protected abstract readonly table: string;

  /** Columns to select (default: all). */
  protected selectColumns = '*';

  /** Whether the table supports soft-delete via `deleted_at`. */
  protected softDelete = false;

  /** Default sort column. */
  protected defaultSortColumn = 'created_at';

  /** Default sort direction. */
  protected defaultSortOrder: 'asc' | 'desc' = 'desc';

  /** Get the Supabase admin client (always fresh; avoids cache issues in tests). */
  protected get supabase() {
    return getSupabaseAdmin();
  }

  /**
   * Create a new record.
   * Runs `beforeCreate` hook before insert, `afterFind` on the result.
   */
  async create(dto: Partial<T>): Promise<T> {
    const enriched = (await this.beforeCreate(dto)) || dto;
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({ ...enriched, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select(this.selectColumns)
      .single();

    if (error) {
      throw new Error(`Failed to create ${this.table}: ${error.message}`);
    }
    return this.afterFind(data as unknown as T);
  }

  /**
   * Find a record by its primary key (`id`).
   * If `softDelete` is true, excludes soft-deleted records.
   */
  async findById(id: string): Promise<T | null> {
    let query = this.supabase.from(this.table).select(this.selectColumns).eq('id', id);

    if (this.softDelete) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to find ${this.table} by id: ${error.message}`);
    }
    return data ? await this.afterFind(data as unknown as T) : null;
  }

  /**
   * Find a record or throw NotFoundError.
   */
  async findByIdOrThrow(id: string): Promise<T> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(`${this.table} with id '${id}' not found`);
    }
    return record;
  }

  /**
   * Update a record by primary key.
   * Runs `beforeUpdate` hook before update, `afterFind` on the result.
   * If `softDelete` is true, rejects updates to soft-deleted records.
   */
  async update(id: string, dto: Partial<T>): Promise<T> {
    await this.findByIdOrThrow(id); // ensures existence + not soft-deleted

    const enriched = (await this.beforeUpdate(dto)) || dto;
    const { data, error } = await this.supabase
      .from(this.table)
      .update({ ...enriched, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(this.selectColumns)
      .single();

    if (error) {
      throw new Error(`Failed to update ${this.table}: ${error.message}`);
    }
    logger.info(`${this.table} updated`, { id });
    return await this.afterFind(data as unknown as T);
  }

  /**
   * Soft-delete or hard-delete a record.
   * If `softDelete` is true, sets `deleted_at` instead of removing.
   */
  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);

    if (this.softDelete) {
      const { error } = await this.supabase
        .from(this.table)
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(`Failed to soft-delete ${this.table}: ${error.message}`);
      logger.info(`${this.table} soft-deleted`, { id });
    } else {
      const { error } = await this.supabase.from(this.table).delete().eq('id', id);
      if (error) throw new Error(`Failed to delete ${this.table}: ${error.message}`);
      logger.info(`${this.table} hard-deleted`, { id });
    }
  }

  /**
   * List records with optional filters and pagination.
   */
  async list(filters: ListFilters & PaginationParams = {}): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, schoolId, search, sortBy, sortOrder, ...rest } = filters;
    const offset = (page - 1) * limit;
    let query = this.supabase.from(this.table).select('*', { count: 'exact' });

    // Soft-delete filter
    if (this.softDelete) {
      query = query.is('deleted_at', null);
    }

    // School scoping
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    // Additional equality filters from rest params
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }

    // Search filter (by 'name' or 'title' column by default)
    if (search) {
      const s = `%${search}%`;
      query = query.or(`name.ilike.${s},title.ilike.${s}`);
    }

    // Sorting
    const sortColumn = sortBy || this.defaultSortColumn;
    const sortDir = sortOrder || this.defaultSortOrder;
    query = query.order(sortColumn, { ascending: sortDir === 'asc' });

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to list ${this.table}: ${error.message}`);

    return {
      items: await Promise.all((data || []).map((r: any) => this.afterFind(r as T))),
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Simple paginate helper for when only page/limit is needed.
   */
  async paginate(page = 1, limit = 20): Promise<PaginatedResult<T>> {
    return this.list({ page, limit });
  }

  // ── Hooks (override in subclasses) ──────────────────────────

  /** Hook called before creating a record. Return enriched DTO. */
  protected async beforeCreate(_dto: Partial<T>): Promise<Partial<T> | void> {
    // noop
  }

  /** Hook called before updating a record. Return enriched DTO. */
  protected async beforeUpdate(_dto: Partial<T>): Promise<Partial<T> | void> {
    // noop
  }

  /** Hook called after finding/returning a record. Use for transforming output. */
  protected async afterFind(record: T): Promise<T> {
    return record;
  }
}
