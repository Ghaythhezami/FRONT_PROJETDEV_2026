import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Epic } from '../models/domain.models';
import { isUuid } from '../utils/id.util';
import { pickDto } from '../utils/api.util';
import { normalizeArray, normalizeUserStory } from '../utils/domain-normalizers';
import { extractUuid } from '../utils/id.util';

function normalizeEpic(raw: Record<string, unknown>): Epic {
  const epic = pickDto<Epic>(raw, {
    id: ['epicId', 'EpicId', 'id', 'Id'],
    title: ['title', 'Title', 'name', 'Name', 'epicName', 'EpicName'],
    projectId: ['projectId', 'ProjectId'],
  });
  epic.id = extractUuid(raw, ['epicId', 'EpicId', 'id', 'Id']) || epic.id;
  epic.projectId = extractUuid(raw, ['projectId', 'ProjectId']) || epic.projectId;
  return epic;
}

@Injectable({ providedIn: 'root' })
export class EpicService {
  private readonly base = `${API_BASE_URL}/api/Epics`;
  private readonly epicCache = new Map<string, string>();

  constructor(private readonly http: HttpClient) {}

  resolveEpicIdForProject(projectId: string): Observable<string> {
    if (!isUuid(projectId)) {
      return throwError(() => new Error('Invalid project id.'));
    }

    const cached = this.epicCache.get(projectId);
    if (cached) {
      return of(cached);
    }

    return this.getEpicsForProject(projectId).pipe(
      switchMap((epics) => {
        const existing = epics.find((e) => isUuid(e.id));
        if (existing) {
          this.epicCache.set(projectId, existing.id);
          return of(existing.id);
        }
        return this.createDefaultEpic(projectId);
      }),
    );
  }

  getEpicsForProject(projectId: string): Observable<Epic[]> {
    return this.http.get<unknown>(`${this.base}/project/${projectId}`).pipe(
      map((body) => normalizeArray(body, normalizeEpic).filter((e) => isUuid(e.id))),
      catchError(() => of([])),
    );
  }

  create(projectId: string, title: string, description = ''): Observable<Epic> {
    return this.http
      .post<Record<string, unknown>>(this.base, {
        ProjectId: projectId,
        Title: title,
        Description: description,
      })
      .pipe(
        map((body) => {
          const epic = normalizeEpic((body ?? {}) as Record<string, unknown>);
          if (isUuid(epic.id)) {
            this.epicCache.set(projectId, epic.id);
          }
          return epic;
        }),
      );
  }

  private createDefaultEpic(projectId: string): Observable<string> {
    return this.http
      .post<Record<string, unknown>>(this.base, {
        ProjectId: projectId,
        Title: 'Main epic',
        Description: 'Default epic',
      })
      .pipe(
        map((body) => {
          const raw = (body ?? {}) as Record<string, unknown>;
          const id = String(raw['epicId'] ?? raw['EpicId'] ?? '');
          if (!isUuid(id)) {
            throw new Error('Epic created but id missing in response.');
          }
          this.epicCache.set(projectId, id);
          return id;
        }),
        catchError(() =>
          this.loadEpicFromBacklogStories(projectId).pipe(
            switchMap((epicId) => {
              if (epicId) {
                this.epicCache.set(projectId, epicId);
                return of(epicId);
              }
              return throwError(
                () =>
                  new Error(
                    'No epic for this project. Create a project again or ask an admin to add an epic.',
                  ),
              );
            }),
          ),
        ),
      );
  }

  private loadEpicFromBacklogStories(projectId: string): Observable<string | null> {
    return this.http.get<unknown>(`${API_BASE_URL}/api/UserStories/backlog/${projectId}`).pipe(
      map((body) => {
        const stories = normalizeArray(body, normalizeUserStory);
        const withEpic = stories.find((s) => isUuid(s.epicId));
        return withEpic?.epicId ?? null;
      }),
      catchError(() => of(null)),
    );
  }
}
