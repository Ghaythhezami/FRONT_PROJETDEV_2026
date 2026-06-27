import { HttpParams } from '@angular/common/http';
import {
  DEFAULT_PAGE_LIMIT,
  PagedResult,
  PaginationQuery,
} from '../models/pagination.models';

/**
 * Builds query params for client-side pagination only (search is applied in the browser).
 * The backend does not implement page/limit — avoid sending those to reduce noise.
 */
export function buildPaginationParams(query: PaginationQuery): HttpParams {
  let params = new HttpParams();
  if (query.search?.trim()) {
    params = params.set('search', query.search.trim());
  }
  return params;
}

/** @deprecated Backend ignores page/limit; kept for any future server-side paging. */
export function buildServerPaginationParams(query: PaginationQuery): HttpParams {
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_PAGE_LIMIT;

  let params = new HttpParams()
    .set('page', String(page))
    .set('limit', String(limit));

  if (query.search?.trim()) {
    params = params.set('search', query.search.trim());
  }

  if (query.sortBy) {
    params = params.set('sortBy', query.sortBy);
  }

  if (query.sortOrder) {
    params = params.set('sortOrder', query.sortOrder);
  }

  if (query.filters) {
    Object.entries(query.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
  }

  return params;
}

/** Normalizes PascalCase / camelCase API payloads into a typed object. */
export function pickDto<T extends object>(
  source: Record<string, unknown>,
  map: Partial<Record<keyof T, string[]>>,
): T {
  const result = {} as Record<string, unknown>;

  (Object.keys(map) as (keyof T)[]).forEach((targetKey) => {
    const aliases = map[targetKey];
    if (!aliases) {
      return;
    }
    for (const alias of aliases) {
      if (source[alias] !== undefined && source[alias] !== null) {
        result[targetKey as string] = source[alias];
        break;
      }
    }
  });

  return result as T;
}

/**
 * Parses paginated API responses (wrapped object or raw array fallback).
 */
export function parsePagedResponse<T>(
  body: unknown,
  page: number,
  limit: number,
): PagedResult<T> {
  if (body === null || body === undefined) {
    return { items: [], page, limit, total: 0, hasMore: false };
  }

  if (Array.isArray(body)) {
    const all = body as T[];
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);
    return {
      items,
      page,
      limit,
      total: all.length,
      hasMore: start + limit < all.length,
    };
  }

  if (typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const items = (record['items'] ??
      record['Items'] ??
      record['data'] ??
      record['Data'] ??
      record['results'] ??
      record['Results'] ??
      []) as T[];

    const total = Number(
      record['total'] ??
        record['Total'] ??
        record['totalCount'] ??
        record['TotalCount'] ??
        record['count'] ??
        record['Count'] ??
        items.length,
    );

    const hasMore = Boolean(
      record['hasMore'] ??
        record['HasMore'] ??
        record['hasNextPage'] ??
        record['HasNextPage'] ??
        page * limit < total,
    );

    return { items, page, limit, total, hasMore };
  }

  return { items: [], page, limit, total: 0, hasMore: false };
}
