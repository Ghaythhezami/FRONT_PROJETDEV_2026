import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { UserStory } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeArray, normalizeUserStory } from '../utils/domain-normalizers';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';

export interface CreateUserStoryPayload {
  Title: string;
  Description?: string;
  StoryPoints?: number;
  Priority: number;
  MoSCoW: number;
  EpicId: string;
  SprintId?: string;
  Status: number;
}

@Injectable({ providedIn: 'root' })
export class UserStoryService {
  private readonly base = `${API_BASE_URL}/api/UserStories`;

  constructor(private readonly http: HttpClient) {}

  getBacklog(projectId: string, query: PaginationQuery): Observable<PagedResult<UserStory>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/backlog/${projectId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeUserStory)
            : normalizeArray(body, normalizeUserStory),
        };
      }),
    );
  }

  getBySprint(sprintId: string, query: PaginationQuery): Observable<PagedResult<UserStory>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/sprint/${sprintId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeUserStory)
            : normalizeArray(body, normalizeUserStory),
        };
      }),
    );
  }

  create(payload: CreateUserStoryPayload): Observable<UserStory> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeUserStory));
  }

  assignToSprint(id: string, sprintId: string | null): Observable<UserStory> {
    return this.http
      .patch<Record<string, unknown>>(`${this.base}/${id}/sprint`, { SprintId: sprintId })
      .pipe(map(normalizeUserStory));
  }
}
