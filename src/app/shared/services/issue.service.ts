import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Issue, ItemStatus } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeIssue } from '../utils/domain-normalizers';
import { fetchClientPagedList, fetchServerPagedList } from '../utils/list-api.util';
import { JSON_HEADERS, rawGuidBody } from '../utils/http-body.util';
import { isUuid } from '../utils/id.util';

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
    return fetchClientPagedList(
      this.http,
      `${this.base}/board/${sprintId}`,
      query,
      (raw) => normalizeIssue(raw),
      (item, term) => item.title.toLowerCase().includes(term),
    );
  }

  getMyTasks(query: PaginationQuery): Observable<PagedResult<Issue>> {
    return fetchServerPagedList(
      this.http,
      `${this.base}/my-tasks`,
      query,
      (raw) => normalizeIssue(raw),
    );
  }

  /** Resolves an issue when opening detail without router state. */
  resolveIssue(issueId: string, sprintId?: string | null): Observable<Issue | null> {
    if (!isUuid(issueId)) {
      return of(null);
    }

    const fromSprint = sprintId
      ? this.fetchAllFromBoard(sprintId).pipe(
          map((issues) => issues.find((i) => i.id === issueId) ?? null),
        )
      : of(null);

    return fromSprint.pipe(
      switchMap((found) => {
        if (found) {
          return of(found);
        }
        return this.fetchAllMyTasks().pipe(
          map((issues) => issues.find((i) => i.id === issueId) ?? null),
        );
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

  assign(id: string, assigneeId: string | null): Observable<Issue> {
    return this.http
      .patch<Record<string, unknown>>(`${this.base}/${id}/assign`, rawGuidBody(assigneeId), {
        headers: JSON_HEADERS,
      })
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

  private fetchAllFromBoard(sprintId: string): Observable<Issue[]> {
    return this.collectAllPages((page) => this.getBoard(sprintId, { page, limit: 50 }));
  }

  private fetchAllMyTasks(): Observable<Issue[]> {
    return this.collectAllPages((page) => this.getMyTasks({ page, limit: 50 }));
  }

  private collectAllPages<T>(
    fetchPage: (page: number) => Observable<PagedResult<T>>,
  ): Observable<T[]> {
    const load = (page: number, acc: T[]): Observable<T[]> =>
      fetchPage(page).pipe(
        switchMap((result) => {
          const next = [...acc, ...result.items];
          return result.hasMore ? load(page + 1, next) : of(next);
        }),
      );
    return load(1, []);
  }
}
