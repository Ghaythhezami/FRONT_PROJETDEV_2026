import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Issue, ItemStatus } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeArray, normalizeIssue } from '../utils/domain-normalizers';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';

export interface CreateIssuePayload {
  Title: string;
  Order?: number;
  UserStoryId: string;
  AssigneeId?: string;
}

export interface MoveIssuePayload {
  Status: ItemStatus | number;
  Order?: number;
}

export interface UpdateIssuePayload {
  Title: string;
  Status: ItemStatus | number;
  Order?: number;
  UserStoryId: string;
  AssigneeId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class IssueService {
  private readonly base = `${API_BASE_URL}/api/Issues`;

  constructor(private readonly http: HttpClient) {}

  getBoard(sprintId: string, query: PaginationQuery): Observable<PagedResult<Issue>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/board/${sprintId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeIssue)
            : normalizeArray(body, normalizeIssue),
        };
      }),
    );
  }

  getMyTasks(query: PaginationQuery): Observable<PagedResult<Issue>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/my-tasks`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeIssue)
            : normalizeArray(body, normalizeIssue),
        };
      }),
    );
  }

  create(payload: CreateIssuePayload): Observable<Issue> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeIssue));
  }

  move(id: string, payload: MoveIssuePayload): Observable<Issue> {
    return this.http
      .patch<Record<string, unknown>>(`${this.base}/${id}/move`, payload)
      .pipe(map(normalizeIssue));
  }

  assign(id: string, assigneeId: string): Observable<Issue> {
    return this.http
      .patch<Record<string, unknown>>(`${this.base}/${id}/assign`, { AssigneeId: assigneeId })
      .pipe(map(normalizeIssue));
  }

  update(id: string, payload: UpdateIssuePayload): Observable<Issue> {
    return this.http
      .put<Record<string, unknown>>(`${this.base}/${id}`, payload)
      .pipe(map(normalizeIssue));
  }

  autoAssign(id: string): Observable<Issue> {
    return this.http
      .post<Record<string, unknown>>(`${this.base}/${id}/auto-assign`, {})
      .pipe(map(normalizeIssue));
  }
}
