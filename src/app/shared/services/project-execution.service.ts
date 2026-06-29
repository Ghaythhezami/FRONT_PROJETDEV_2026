import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ProjectExecutionService {
  private readonly base = `${API_BASE_URL}/api/ProjectExecution`;

  constructor(private readonly http: HttpClient) {}

  finalize(projectId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${projectId}/finalize`, {});
  }
}
