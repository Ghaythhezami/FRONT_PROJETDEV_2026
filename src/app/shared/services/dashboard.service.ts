import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  ActiveSprintSummary,
  BurndownPoint,
  DashboardProjectSummary,
  Issue,
  SprintBoard,
  TeamWorkloadMember,
  VelocityPoint,
} from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import {
  normalizeArray,
  normalizeBurndownPoints,
  normalizeIssue,
  normalizeProject,
  normalizeSprintBoard,
  normalizeTeamWorkload,
  normalizeVelocityPoints,
  normalizeActiveSprintSummary,
} from '../utils/domain-normalizers';
import { PaginatedApiService } from './paginated-api.service';
import { fetchClientPagedList, fetchServerPagedList } from '../utils/list-api.util';

type Raw = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${API_BASE_URL}/api/Dashboard`;

  constructor(
    private readonly http: HttpClient,
    private readonly paginatedApi: PaginatedApiService,
  ) {}

  getMyProjects(query: PaginationQuery): Observable<PagedResult<DashboardProjectSummary>> {
    return fetchServerPagedList(
      this.http,
      `${this.base}/my-projects`,
      query,
      (raw) => normalizeProject(raw),
    );
  }

  getActiveSprint(projectId: string): Observable<ActiveSprintSummary | null> {
    return this.http.get<unknown>(`${this.base}/active-sprint/${projectId}`).pipe(
      map((body) => normalizeActiveSprintSummary(body as Raw)),
      catchError((error) => (error?.status === 404 ? of(null) : throwError(() => error))),
    );
  }

  getSprintBoard(sprintId: string): Observable<SprintBoard> {
    return this.http
      .get<unknown>(`${this.base}/sprint-board/${sprintId}`)
      .pipe(map((body) => normalizeSprintBoard(body, sprintId)));
  }

  getTeamWorkload(
    projectId: string,
    query: PaginationQuery,
  ): Observable<PagedResult<TeamWorkloadMember>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/team-workload/${projectId}`,
      query,
      normalizeTeamWorkload,
      (item, term) => item.memberName.toLowerCase().includes(term),
    );
  }

  getBurndown(sprintId: string): Observable<BurndownPoint[]> {
    return this.http
      .get<unknown>(`${this.base}/burndown/${sprintId}`)
      .pipe(map((body) => normalizeBurndownPoints(normalizeArray(body, (r) => r))));
  }

  getVelocity(projectId: string, query: PaginationQuery): Observable<PagedResult<VelocityPoint>> {
    return this.http.get<unknown>(`${this.base}/velocity/${projectId}`).pipe(
      map((body) => {
        const points = normalizeVelocityPoints(normalizeArray(body, (r) => r));
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const start = (page - 1) * limit;
        const items = points.slice(start, start + limit);
        return {
          items,
          page,
          limit,
          total: points.length,
          hasMore: start + limit < points.length,
        };
      }),
    );
  }

  getBlockedOverdue(projectId: string, query: PaginationQuery): Observable<PagedResult<Issue>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/blocked-overdue/${projectId}`,
      query,
      normalizeIssue,
      (item, term) => item.title.toLowerCase().includes(term),
    );
  }
}
