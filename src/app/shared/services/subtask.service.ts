import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SubTask } from '../models/domain.models';
import { pickDto } from '../utils/api.util';
import { normalizeArray } from '../utils/domain-normalizers';
import { extractUuid } from '../utils/id.util';

export interface CreateSubTaskPayload {
  Title: string;
  IssueId: string;
}

function normalizeSubTask(raw: Record<string, unknown>): SubTask {
  const subtask = pickDto<SubTask>(raw, {
    id: ['subTaskId', 'SubTaskId', 'id', 'Id'],
    title: ['title', 'Title'],
    isCompleted: ['isCompleted', 'IsCompleted'],
    issueId: ['issueId', 'IssueId'],
  });
  subtask.id = extractUuid(raw, ['subTaskId', 'SubTaskId', 'id', 'Id']) || subtask.id;
  subtask.issueId = extractUuid(raw, ['issueId', 'IssueId']) || subtask.issueId;
  return subtask;
}

@Injectable({ providedIn: 'root' })
export class SubtaskService {
  private readonly base = `${API_BASE_URL}/api/SubTasks`;

  constructor(private readonly http: HttpClient) {}

  getByIssue(issueId: string): Observable<SubTask[]> {
    return this.http
      .get<unknown>(`${this.base}/issue/${issueId}`)
      .pipe(map((body) => normalizeArray(body, normalizeSubTask)));
  }

  create(payload: CreateSubTaskPayload): Observable<SubTask> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeSubTask));
  }

  toggle(subtask: SubTask): Observable<SubTask> {
    return this.http
      .put<Record<string, unknown>>(`${this.base}/${subtask.id}/toggle`, {
        Title: subtask.title,
        IsCompleted: !subtask.isCompleted,
        IssueId: subtask.issueId,
      })
      .pipe(map(normalizeSubTask));
  }
}
