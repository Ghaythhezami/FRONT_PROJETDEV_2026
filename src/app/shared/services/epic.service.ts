import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Epic } from '../models/domain.models';
import { extractUuid, isUuid } from '../utils/id.util';
import { pickDto } from '../utils/api.util';
import { normalizeArray, normalizeUserStory } from '../utils/domain-normalizers';

function normalizeEpic(raw: Record<string, unknown>): Epic {
  return pickDto<Epic>(raw, {
    id: ['epicId', 'EpicId', 'id', 'Id'],
    title: ['title', 'Title', 'name', 'Name', 'epicName', 'EpicName'],
    projectId: ['projectId', 'ProjectId'],
  });
}

@Injectable({ providedIn: 'root' })
export class EpicService {
  private readonly projectBase = `${API_BASE_URL}/api/Projects`;
  private readonly epicCache = new Map<string, string>();

  constructor(private readonly http: HttpClient) {}

  /** Resolves a valid EpicId for UserStory creation (never uses projectId as epic). */
  resolveEpicIdForProject(projectId: string): Observable<string> {
    if (!isUuid(projectId)) {
      return throwError(() => new Error('Invalid project id.'));
    }

    const cached = this.epicCache.get(projectId);
    if (cached) {
      return of(cached);
    }

    return this.loadEpicsFromProject(projectId).pipe(
      switchMap((epics) => {
        const existing = epics.find((e) => isUuid(e.id));
        if (existing) {
          this.epicCache.set(projectId, existing.id);
          return of(existing.id);
        }
        return this.loadEpicFromBacklogStories(projectId).pipe(
          switchMap((epicId) => {
            if (epicId) {
              this.epicCache.set(projectId, epicId);
              return of(epicId);
            }
            return this.createDefaultEpic(projectId);
          }),
        );
      }),
    );
  }

  getEpicsForProject(projectId: string): Observable<Epic[]> {
    return this.loadEpicsFromProject(projectId);
  }

  private loadEpicsFromProject(projectId: string): Observable<Epic[]> {
    return this.http.get<unknown>(`${this.projectBase}/${projectId}`).pipe(
      map((body) => {
        if (!body || typeof body !== 'object') {
          return [];
        }
        const raw = body as Record<string, unknown>;

        const singleEpicId = extractUuid(raw, [
          'epicId',
          'EpicId',
          'defaultEpicId',
          'DefaultEpicId',
        ]);
        if (singleEpicId) {
          return [
            {
              id: singleEpicId,
              title: String(raw['epicName'] ?? raw['EpicName'] ?? 'Project epic'),
              projectId,
            },
          ];
        }

        const epicsRaw = (raw['epics'] ?? raw['Epics'] ?? raw['epicList'] ?? raw['EpicList']) as
          | unknown[]
          | undefined;
        if (Array.isArray(epicsRaw) && epicsRaw.length) {
          return epicsRaw
            .map((item) => normalizeEpic(item as Record<string, unknown>))
            .filter((e) => isUuid(e.id));
        }

        return [];
      }),
      catchError(() => of([])),
    );
  }

  private loadEpicFromBacklogStories(projectId: string): Observable<string | null> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/api/UserStories/backlog/${projectId}`, {
        params: { page: '1', limit: '10' },
      })
      .pipe(
        map((body) => {
          const stories = normalizeArray(body, normalizeUserStory);
          const withEpic = stories.find((s) => isUuid(s.epicId));
          return withEpic?.epicId ?? null;
        }),
        catchError(() => of(null)),
      );
  }

  private createDefaultEpic(projectId: string): Observable<string> {
    const payloads = [
      { ProjectId: projectId, Title: 'Main epic', Name: 'Main epic' },
      { projectId, title: 'Main epic', name: 'Main epic' },
      { ProjectId: projectId, EpicName: 'Main epic' },
    ];

    const endpoints = [
      `${API_BASE_URL}/api/Epics`,
      `${API_BASE_URL}/api/Epic`,
    ];

    const tryCreate = (endpointIndex: number, payloadIndex: number): Observable<string> => {
      if (endpointIndex >= endpoints.length) {
        return throwError(
          () =>
            new Error(
              'No epic found for this project. Ask an admin to create an epic in the backend, or add a user story via Swagger with a valid EpicId first.',
            ),
        );
      }
      if (payloadIndex >= payloads.length) {
        return tryCreate(endpointIndex + 1, 0);
      }

      return this.http.post<unknown>(endpoints[endpointIndex], payloads[payloadIndex]).pipe(
        map((body) => {
          const raw = (body ?? {}) as Record<string, unknown>;
          const id = extractUuid(raw, ['epicId', 'EpicId', 'id', 'Id']);
          if (!id) {
            throw new Error('Epic created but id missing in response.');
          }
          this.epicCache.set(projectId, id);
          return id;
        }),
        catchError(() => tryCreate(endpointIndex, payloadIndex + 1)),
      );
    };

    return tryCreate(0, 0);
  }
}
