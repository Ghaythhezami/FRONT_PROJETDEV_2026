import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class PaginatedApiService {
  constructor(private readonly http: HttpClient) {}

  getPaged<T>(url: string, query: PaginationQuery): Observable<PagedResult<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(url, { params }).pipe(
      map((body) => parsePagedResponse<T>(body, page, limit)),
    );
  }

  getPagedWithParams<T>(
    url: string,
    query: PaginationQuery,
    extraParams?: Record<string, string>,
  ): Observable<PagedResult<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    let params = buildPaginationParams(query);

    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        params = params.set(key, value);
      });
    }

    return this.http.get<unknown>(url, { params }).pipe(
      map((body) => parsePagedResponse<T>(body, page, limit)),
    );
  }
}
