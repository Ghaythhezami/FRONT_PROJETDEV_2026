import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { UserStory } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeUserStory } from '../utils/domain-normalizers';
import { fetchClientPagedList } from '../utils/list-api.util';
import { JSON_HEADERS, rawGuidBody } from '../utils/http-body.util';

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
    return fetchClientPagedList(
      this.http,
      `${this.base}/backlog/${projectId}`,
      query,
      (raw) => normalizeUserStory(raw),
      (item, term) =>
        `${item.title} ${item.description ?? ''}`.toLowerCase().includes(term),
    );
  }

  getBySprint(sprintId: string, query: PaginationQuery): Observable<PagedResult<UserStory>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/sprint/${sprintId}`,
      query,
      (raw) => normalizeUserStory(raw),
      (item, term) => item.title.toLowerCase().includes(term),
    );
  }

  create(payload: CreateUserStoryPayload): Observable<UserStory> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeUserStory));
  }

  assignToSprint(id: string, sprintId: string | null): Observable<UserStory> {
    return this.http
      .patch<Record<string, unknown>>(`${this.base}/${id}/sprint`, rawGuidBody(sprintId), {
        headers: JSON_HEADERS,
      })
      .pipe(map(normalizeUserStory));
  }
}
