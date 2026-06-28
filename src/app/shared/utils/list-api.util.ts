import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildServerPaginationParams, parsePagedResponse } from './api.util';

type Raw = Record<string, unknown>;

/** Server-side pagination with page, limit, search query params. */
export function fetchServerPagedList<T>(
  http: HttpClient,
  url: string,
  query: PaginationQuery,
  mapItem: (raw: Raw) => T,
): Observable<PagedResult<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const params = buildServerPaginationParams(query);

  return http.get<unknown>(url, { params }).pipe(
    map((body) => {
      if (Array.isArray(body)) {
        return parsePagedResponse(body.map(mapItem), page, limit);
      }
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        const rawItems = (record['items'] ?? record['Items'] ?? []) as Raw[];
        const items = rawItems.map(mapItem);
        return parsePagedResponse({ ...record, items }, page, limit);
      }
      return parsePagedResponse<T>([], page, limit);
    }),
  );
}

/**
 * Fetches a full list from the API (no server-side pagination) and pages/filters on the client.
 */
export function fetchClientPagedList<T>(
  http: HttpClient,
  url: string,
  query: PaginationQuery,
  mapItem: (raw: Raw) => T,
  matchesSearch?: (item: T, term: string) => boolean,
): Observable<PagedResult<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const search = query.search?.trim().toLowerCase() ?? '';

  return http.get<unknown>(url).pipe(
    map((body) => {
      const rawList = Array.isArray(body) ? (body as Raw[]) : [];
      let items = rawList.map(mapItem);
      if (search && matchesSearch) {
        items = items.filter((item) => matchesSearch(item, search));
      }
      return parsePagedResponse(items, page, limit);
    }),
  );
}
