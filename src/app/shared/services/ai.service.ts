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

export interface AiPredictionResponse {
  predictionType: string;
  suggestedValue: string;
  confidenceScore: number;
  suggestions: string[];
  /** Formatted text ready for UI display */
  displayText: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${API_BASE_URL}/api/ai`;

  constructor(private readonly http: HttpClient) {}

  generateDescription(body: GenerateDescriptionRequest): Observable<string> {
    return this.http
      .post<AiPredictionResponse | Record<string, unknown>>(`${this.base}/generate-description`, body)
      .pipe(map((r) => this.normalize(r).displayText));
  }

  generateAcceptanceCriteria(body: GenerateDescriptionRequest): Observable<string> {
    return this.http
      .post<AiPredictionResponse | Record<string, unknown>>(`${this.base}/generate-acceptance-criteria`, body)
      .pipe(map((r) => this.normalize(r).displayText));
  }

  generateSubtasks(body: GenerateSubTasksRequest): Observable<AiPredictionResponse> {
    return this.http
      .post<AiPredictionResponse | Record<string, unknown>>(`${this.base}/generate-subtasks`, body)
      .pipe(map((r) => this.normalize(r)));
  }

  predictPriority(userStoryId: string): Observable<string> {
    return this.http
      .post<AiPredictionResponse | Record<string, unknown>>(`${this.base}/predict-priority/${userStoryId}`, {})
      .pipe(map((r) => this.normalize(r).displayText));
  }

  getSprintRisk(sprintId: string): Observable<string> {
    return this.http
      .get<AiPredictionResponse | Record<string, unknown>>(`${this.base}/sprint-risk/${sprintId}`)
      .pipe(map((r) => this.normalize(r).displayText));
  }

  getDailyStandup(projectId: string): Observable<string> {
    return this.http
      .get<AiPredictionResponse | Record<string, unknown>>(`${this.base}/daily-standup/${projectId}`)
      .pipe(map((r) => this.normalize(r).displayText));
  }

  getReleaseNotes(projectId: string): Observable<string> {
    return this.http
      .get<AiPredictionResponse | Record<string, unknown>>(`${this.base}/release-notes/${projectId}`)
      .pipe(map((r) => this.normalize(r).displayText));
  }

  private normalize(raw: AiPredictionResponse | Record<string, unknown>): AiPredictionResponse {
    const record = raw as Record<string, unknown>;
    const suggestions = this.readSuggestions(record);
    const suggestedValue = String(
      record['suggestedValue'] ?? record['SuggestedValue'] ?? '',
    ).trim();
    const predictionType = String(
      record['predictionType'] ?? record['PredictionType'] ?? 'AI',
    );
    const confidenceScore = Number(
      record['confidenceScore'] ?? record['ConfidenceScore'] ?? 0,
    );

    const displayText = this.formatDisplay(suggestedValue, suggestions, predictionType);

    return {
      predictionType,
      suggestedValue,
      confidenceScore,
      suggestions,
      displayText,
    };
  }

  private readSuggestions(record: Record<string, unknown>): string[] {
    const raw = record['suggestions'] ?? record['Suggestions'];
    if (Array.isArray(raw)) {
      return raw.map((s) => String(s)).filter(Boolean);
    }
    return [];
  }

  private formatDisplay(suggestedValue: string, suggestions: string[], predictionType: string): string {
    if (suggestions.length) {
      return suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    }
    if (suggestedValue.includes('|')) {
      return suggestedValue
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');
    }
    if (suggestedValue) {
      return suggestedValue;
    }
    return `No ${predictionType} suggestion available.`;
  }
}
