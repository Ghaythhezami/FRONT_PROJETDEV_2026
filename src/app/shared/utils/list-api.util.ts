import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { parsePagedResponse } from './api.util';

type Raw = Record<string, unknown>;

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
