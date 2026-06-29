import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  ActiveSprintSummary,
  BurndownPoint,
  DashboardProjectSummary,
  HomeDashboardStats,
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

  getHomeStats(): Observable<HomeDashboardStats> {
    return this.http.get<Record<string, unknown>>(`${this.base}/home-stats`).pipe(
      map((raw) => ({
        isGlobalView: Boolean(raw['isGlobalView'] ?? raw['IsGlobalView'] ?? false),
        myOpenTasks: Number(raw['myOpenTasks'] ?? raw['MyOpenTasks'] ?? 0),
        myDoneTasks: Number(raw['myDoneTasks'] ?? raw['MyDoneTasks'] ?? 0),
        globalOpenTasks: Number(raw['globalOpenTasks'] ?? raw['GlobalOpenTasks'] ?? 0),
        globalDoneTasks: Number(raw['globalDoneTasks'] ?? raw['GlobalDoneTasks'] ?? 0),
        activeSprints: Number(raw['activeSprints'] ?? raw['ActiveSprints'] ?? 0),
        totalProjects: Number(raw['totalProjects'] ?? raw['TotalProjects'] ?? 0),
        teamMembers: Number(raw['teamMembers'] ?? raw['TeamMembers'] ?? 0),
        reviewFailures: Number(raw['reviewFailures'] ?? raw['ReviewFailures'] ?? 0),
        contributorCount: Number(raw['contributorCount'] ?? raw['ContributorCount'] ?? 0),
        contributorNames: ((raw['contributorNames'] ?? raw['ContributorNames'] ?? []) as string[]),
        sprintContributions: ((raw['sprintContributions'] ?? raw['SprintContributions'] ?? []) as Record<string, unknown>[]).map(
          (item) => ({
            developerName: String(item['developerName'] ?? item['DeveloperName'] ?? ''),
            totalTasks: Number(item['totalTasks'] ?? item['TotalTasks'] ?? 0),
            doneTasks: Number(item['doneTasks'] ?? item['DoneTasks'] ?? 0),
          }),
        ),
        recentTasks: ((raw['recentTasks'] ?? raw['RecentTasks'] ?? []) as Record<string, unknown>[]).map(
          (item) => ({
            issueId: String(item['issueId'] ?? item['IssueId'] ?? ''),
            title: String(item['title'] ?? item['Title'] ?? ''),
            projectName: String(item['projectName'] ?? item['ProjectName'] ?? ''),
            projectKey: String(item['projectKey'] ?? item['ProjectKey'] ?? ''),
            status: Number(item['status'] ?? item['Status'] ?? 0),
          }),
        ),
        recentProjects: ((raw['recentProjects'] ?? raw['RecentProjects'] ?? []) as Record<string, unknown>[]).map(
          (item) => ({
            projectId: String(item['projectId'] ?? item['ProjectId'] ?? ''),
            projectName: String(item['projectName'] ?? item['ProjectName'] ?? ''),
            key: String(item['key'] ?? item['Key'] ?? ''),
            activeSprintName: String(item['activeSprintName'] ?? item['ActiveSprintName'] ?? ''),
          }),
        ),
        aiRecommendation: String(raw['aiRecommendation'] ?? raw['AiRecommendation'] ?? ''),
      })),
    );
  }

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
      map((body) => {
        if (body == null || typeof body !== 'object') {
          return null;
        }
        const summary = normalizeActiveSprintSummary(body as Raw);
        return summary.sprintId ? summary : null;
      }),
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
