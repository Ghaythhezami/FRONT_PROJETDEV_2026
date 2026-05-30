import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SubTask } from '../models/domain.models';
import { pickDto } from '../utils/api.util';

export interface CreateSubTaskPayload {
  Title: string;
  IssueId: string;
}

function normalizeSubTask(raw: Record<string, unknown>): SubTask {
  return pickDto<SubTask>(raw, {
    id: ['id', 'Id', 'subTaskId', 'SubTaskId'],
    title: ['title', 'Title'],
    isCompleted: ['isCompleted', 'IsCompleted'],
    issueId: ['issueId', 'IssueId'],
  });
}

@Injectable({ providedIn: 'root' })
export class SubtaskService {
  private readonly base = `${API_BASE_URL}/api/SubTasks`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateSubTaskPayload): Observable<SubTask> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeSubTask));
  }

  toggle(id: string): Observable<SubTask> {
    return this.http
      .put<Record<string, unknown>>(`${this.base}/${id}/toggle`, {})
      .pipe(map(normalizeSubTask));
  }
}
