import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  BurndownPoint,
  DashboardProjectSummary,
  Sprint,
  SprintBoard,
  TeamWorkloadMember,
  VelocityPoint,
} from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeArray, normalizeProject, normalizeSprint, normalizeSprintBoard } from '../utils/domain-normalizers';
import { PaginatedApiService } from './paginated-api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${API_BASE_URL}/api/Dashboard`;

  constructor(private readonly paginatedApi: PaginatedApiService) {}

  getMyProjects(query: PaginationQuery): Observable<PagedResult<DashboardProjectSummary>> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/my-projects`, query)
      .pipe(
        map((result) => ({
          ...result,
          items: result.items.map((item) => normalizeProject(item as Record<string, unknown>)),
        })),
      );
  }

  getActiveSprint(projectId: string): Observable<Sprint | null> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/active-sprint/${projectId}`, {
        page: 1,
        limit: 1,
      })
      .pipe(
        map((result) => {
          const first = result.items[0];
          return first ? normalizeSprint(first as Record<string, unknown>) : null;
        }),
      );
  }

  getSprintBoard(sprintId: string): Observable<SprintBoard> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/sprint-board/${sprintId}`, {
        page: 1,
        limit: 10,
      })
      .pipe(
        map((result) => {
          if (result.items.length === 1) {
            return normalizeSprintBoard(result.items[0] as Record<string, unknown>, sprintId);
          }
          return normalizeSprintBoard({ issues: result.items }, sprintId);
        }),
      );
  }

  getTeamWorkload(projectId: string, query: PaginationQuery): Observable<PagedResult<TeamWorkloadMember>> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/team-workload/${projectId}`, query)
      .pipe(
        map((result) => ({
          ...result,
          items: result.items.map(
            (item) =>
              ({
                memberId: String(item['memberId'] ?? item['MemberId'] ?? ''),
                memberName: String(item['memberName'] ?? item['MemberName'] ?? ''),
                assignedIssues: Number(item['assignedIssues'] ?? item['AssignedIssues'] ?? 0),
                completedIssues: Number(item['completedIssues'] ?? item['CompletedIssues'] ?? 0),
              }) satisfies TeamWorkloadMember,
          ),
        })),
      );
  }

  getBurndown(sprintId: string): Observable<BurndownPoint[]> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/burndown/${sprintId}`, { page: 1, limit: 30 })
      .pipe(map((result) => normalizeArray(result.items, (raw) => ({
        date: String(raw['date'] ?? raw['Date'] ?? ''),
        remaining: Number(raw['remaining'] ?? raw['Remaining'] ?? 0),
        ideal: Number(raw['ideal'] ?? raw['Ideal'] ?? 0),
      }))));
  }

  getVelocity(projectId: string, query: PaginationQuery): Observable<PagedResult<VelocityPoint>> {
    return this.paginatedApi
      .getPaged<Record<string, unknown>>(`${this.base}/velocity/${projectId}`, query)
      .pipe(
        map((result) => ({
          ...result,
          items: result.items.map((raw) => ({
            sprintName: String(raw['sprintName'] ?? raw['SprintName'] ?? ''),
            completedPoints: Number(raw['completedPoints'] ?? raw['CompletedPoints'] ?? 0),
          })),
        })),
      );
  }

  getBlockedOverdue(projectId: string, query: PaginationQuery): Observable<PagedResult<Record<string, unknown>>> {
    return this.paginatedApi.getPaged(`${this.base}/blocked-overdue/${projectId}`, query);
  }
}
