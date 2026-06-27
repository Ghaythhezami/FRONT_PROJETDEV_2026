import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ProjectMember } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeProjectMember } from '../utils/domain-normalizers';
import { fetchClientPagedList } from '../utils/list-api.util';

@Injectable({ providedIn: 'root' })
export class ProjectMemberService {
  private readonly base = `${API_BASE_URL}/api/ProjectMembers`;

  constructor(private readonly http: HttpClient) {}

  getByProject(projectId: string, query: PaginationQuery): Observable<PagedResult<ProjectMember>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/project/${projectId}`,
      query,
      (raw) => normalizeProjectMember(raw),
      (item, term) =>
        `${item.memberName ?? ''} ${item.memberEmail ?? ''} ${item.memberId}`
          .toLowerCase()
          .includes(term),
    );
  }

  add(projectId: string, memberId: string): Observable<ProjectMember> {
    return this.http
      .post<Record<string, unknown>>(this.base, { ProjectId: projectId, MemberId: memberId })
      .pipe(map(normalizeProjectMember));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
