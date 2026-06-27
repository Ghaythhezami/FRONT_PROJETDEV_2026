import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Sprint } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeSprint } from '../utils/domain-normalizers';
import { fetchClientPagedList } from '../utils/list-api.util';

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

  constructor(private readonly http: HttpClient) {}

  getByProject(projectId: string, query: PaginationQuery): Observable<PagedResult<Sprint>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/project/${projectId}`,
      query,
      (raw) => normalizeSprint(raw),
      (item, term) => item.name.toLowerCase().includes(term),
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
    return this.http.post<void>(`${this.base}/${sprint.id}/start`, {});
  }

  close(sprint: Sprint): Observable<void> {
    return this.http.post<void>(`${this.base}/${sprint.id}/close`, {});
  }
}
