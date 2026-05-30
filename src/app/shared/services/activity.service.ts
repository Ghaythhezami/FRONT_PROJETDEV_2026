import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ActivityItem } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeArray, normalizeActivity } from '../utils/domain-normalizers';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly base = `${API_BASE_URL}/api/Activity`;

  constructor(private readonly http: HttpClient) {}

  getByProject(projectId: string, query: PaginationQuery): Observable<PagedResult<ActivityItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/project/${projectId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeActivity)
            : normalizeArray(body, normalizeActivity),
        };
      }),
    );
  }
}
