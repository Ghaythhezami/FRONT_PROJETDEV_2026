import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { parsePagedResponse } from '../utils/api.util';
import { fetchClientPagedList } from '../utils/list-api.util';

type Raw = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class PaginatedApiService {
  constructor(private readonly http: HttpClient) {}

  /** GET list — client-side page/search only (backend returns full arrays). */
  getPaged<T>(
    url: string,
    query: PaginationQuery,
    mapItem?: (raw: Raw) => T,
    matchesSearch?: (item: T, term: string) => boolean,
  ): Observable<PagedResult<T>> {
    if (mapItem) {
      return fetchClientPagedList(this.http, url, query, mapItem, matchesSearch);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.http.get<unknown>(url).pipe(
      map((body) => parsePagedResponse<T>(body, page, limit)),
    );
  }
}
