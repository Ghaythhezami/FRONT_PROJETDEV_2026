import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Sprint, SprintStatus } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeArray, normalizeSprint } from '../utils/domain-normalizers';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';
import { PaginatedApiService } from './paginated-api.service';

export interface CreateSprintPayload {
  Name: string;
  StartDate: string;
  EndDate: string;
  ProjectId: string;
}

export interface UpdateSprintPayload extends CreateSprintPayload {
  Status: number;
  CompletedPoints?: number;
}

@Injectable({ providedIn: 'root' })
export class SprintService {
  private readonly base = `${API_BASE_URL}/api/Sprints`;

  constructor(
    private readonly http: HttpClient,
    private readonly paginatedApi: PaginatedApiService,
  ) {}

  getByProject(projectId: string, query: PaginationQuery): Observable<PagedResult<Sprint>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http
      .get<unknown>(`${this.base}/project/${projectId}`, { params })
      .pipe(
        map((body) => {
          const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
          return {
            ...parsed,
            items: parsed.items.length
              ? parsed.items.map(normalizeSprint)
              : normalizeArray(body, normalizeSprint),
          };
        }),
      );
  }

  create(payload: CreateSprintPayload): Observable<Sprint> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeSprint));
  }

  update(id: string, payload: UpdateSprintPayload): Observable<Sprint> {
    return this.http
      .put<Record<string, unknown>>(`${this.base}/${id}`, payload)
      .pipe(map(normalizeSprint));
  }

  start(sprint: Sprint): Observable<void> {
    return this.http.post<void>(`${this.base}/${sprint.id}/start`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.update(sprint.id, {
            Name: sprint.name,
            StartDate: sprint.startDate,
            EndDate: sprint.endDate,
            ProjectId: sprint.projectId,
            Status: SprintStatus.Active,
            CompletedPoints: sprint.completedPoints ?? 0,
          }).pipe(map(() => void 0));
        }
        return throwError(() => error);
      }),
    );
  }

  close(sprint: Sprint): Observable<void> {
    return this.http.post<void>(`${this.base}/${sprint.id}/close`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.update(sprint.id, {
            Name: sprint.name,
            StartDate: sprint.startDate,
            EndDate: sprint.endDate,
            ProjectId: sprint.projectId,
            Status: SprintStatus.Completed,
            CompletedPoints: sprint.completedPoints ?? 0,
          }).pipe(map(() => void 0));
        }
        return throwError(() => error);
      }),
    );
  }
}
