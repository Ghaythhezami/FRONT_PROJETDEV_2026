import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface GenerateDescriptionRequest {
  Title?: string;
  ProjectId?: string;
}

export interface GenerateSubTasksRequest {
  Title?: string;
  Description?: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${API_BASE_URL}/api/ai`;

  constructor(private readonly http: HttpClient) {}

  generateDescription(body: GenerateDescriptionRequest): Observable<string> {
    return this.http
      .post(`${this.base}/generate-description`, body, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  generateAcceptanceCriteria(body: GenerateDescriptionRequest): Observable<string> {
    return this.http
      .post(`${this.base}/generate-acceptance-criteria`, body, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  generateSubtasks(body: GenerateSubTasksRequest): Observable<string> {
    return this.http
      .post(`${this.base}/generate-subtasks`, body, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  predictPriority(userStoryId: string): Observable<string> {
    return this.http
      .post(`${this.base}/predict-priority/${userStoryId}`, {}, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  getSprintRisk(sprintId: string): Observable<string> {
    return this.http
      .get(`${this.base}/sprint-risk/${sprintId}`, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  getDailyStandup(projectId: string): Observable<string> {
    return this.http
      .get(`${this.base}/daily-standup/${projectId}`, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  getReleaseNotes(projectId: string): Observable<string> {
    return this.http
      .get(`${this.base}/release-notes/${projectId}`, { responseType: 'text' })
      .pipe(map((r) => this.unwrapText(r)));
  }

  private unwrapText(response: string): string {
    try {
      const parsed = JSON.parse(response) as Record<string, unknown>;
      return String(
        parsed['result'] ??
          parsed['Result'] ??
          parsed['content'] ??
          parsed['Content'] ??
          parsed['text'] ??
          parsed['Text'] ??
          response,
      );
    } catch {
      return response;
    }
  }
}
