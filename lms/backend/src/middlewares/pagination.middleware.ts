import { Request, Response, NextFunction } from 'express';

export interface PaginationQuery {
  page: number;
  limit: number;
  offset: number;
}

export interface SortQuery {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterQuery {
  [key: string]: string | undefined;
}

export interface PaginationRequest extends Request {
  pagination?: PaginationQuery;
  sort?: SortQuery[];
  filters?: FilterQuery;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parses `page` and `limit` query parameters.
 * - Default: page=1, limit=20
 * - Max limit: 100
 * - Returns typed PaginationQuery with offset pre-calculated
 *
 * @example
 * ```ts
 * // ?page=2&limit=10 → { page: 2, limit: 10, offset: 10 }
 * ```
 */
export function parsePagination(req: Request): PaginationQuery {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Parses `?sort=field1:asc,field2:desc` query parameter.
 * Only allows fields in the `allowedFields` array (whitelist approach).
 *
 * @example
 * ```ts
 * // ?sort=name:asc,createdAt:desc
 * // → [{ field: 'name', direction: 'asc' }, { field: 'createdAt', direction: 'desc' }]
 * ```
 */
export function parseSort(req: Request, allowedFields: string[]): SortQuery[] {
  const raw = req.query.sort as string | undefined;
  if (!raw) return [];

  return raw
    .split(',')
    .map((part) => {
      const [field, dir] = part.split(':');
      const direction = (dir?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
      if (field && allowedFields.includes(field)) {
        return { field, direction };
      }
      return null;
    })
    .filter((s): s is SortQuery => s !== null);
}

/**
 * Parses query parameters for filtering based on an allowlist of field names.
 * Excludes reserved parameters (`page`, `limit`, `sort`, `search`).
 *
 * @example
 * ```ts
 * // ?status=active&role=teacher → { status: 'active', role: 'teacher' }
 * ```
 */
export function parseFilters(req: Request, allowedFields: string[]): FilterQuery {
  const reserved = new Set(['page', 'limit', 'sort', 'search']);
  const filters: FilterQuery = {};

  for (const [key, value] of Object.entries(req.query)) {
    if (!reserved.has(key) && allowedFields.includes(key) && typeof value === 'string' && value) {
      filters[key] = value;
    }
  }

  return filters;
}

/**
 * Express middleware that attaches `req.pagination`, `req.sort`, and `req.filters`.
 * Requires `allowedFilterFields` and `allowedSortFields` to be set via `req.allowedFilterFields`
 * or by calling `paginationMiddleware(allowedFilterFields, allowedSortFields)`.
 *
 * @example
 * ```ts
 * router.get('/users',
 *   paginationMiddleware(['status', 'role'], ['name', 'createdAt']),
 *   handler
 * );
 * ```
 */
export function paginationMiddleware(
  allowedFilterFields: string[] = [],
  allowedSortFields: string[] = [],
) {
  return (req: PaginationRequest, _res: Response, next: NextFunction): void => {
    req.pagination = parsePagination(req);
    req.sort = parseSort(req, allowedSortFields);
    req.filters = parseFilters(req, allowedFilterFields);
    next();
  };
}
