import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ActivityItem } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeActivity } from '../utils/domain-normalizers';
import { fetchClientPagedList, fetchServerPagedList } from '../utils/list-api.util';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly base = `${API_BASE_URL}/api/Activity`;

  constructor(private readonly http: HttpClient) {}

  getByProject(projectId: string, query: PaginationQuery): Observable<PagedResult<ActivityItem>> {
    return fetchServerPagedList(
      this.http,
      `${this.base}/project/${projectId}`,
      query,
      (raw) => normalizeActivity(raw),
    );
  }
}
