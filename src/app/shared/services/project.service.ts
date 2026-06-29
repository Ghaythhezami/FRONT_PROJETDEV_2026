import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Project } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeProject } from '../utils/domain-normalizers';
import { fetchServerPagedList } from '../utils/list-api.util';

export interface CreateProjectPayload {
  ProjectName: string;
  ProjectDescription?: string;
  Key: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${API_BASE_URL}/api/Projects`;

  constructor(private readonly http: HttpClient) {}

  getById(id: string): Observable<Project> {
    return this.http
      .get<Record<string, unknown>>(`${this.base}/${id}`)
      .pipe(map((raw) => normalizeProject(raw)));
  }

  create(payload: CreateProjectPayload): Observable<Project> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map((raw) => normalizeProject(raw)));
  }

  /** Paginated list via my-projects dashboard endpoint */
  getMyProjects(query: PaginationQuery): Observable<PagedResult<Project>> {
    return fetchServerPagedList(
      this.http,
      `${API_BASE_URL}/api/Dashboard/my-projects`,
      query,
      normalizeProject,
    );
  }
}
