import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Comment } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';
import { normalizeArray } from '../utils/domain-normalizers';
import { pickDto } from '../utils/api.util';

export interface CreateCommentPayload {
  Content: string;
  IssueId: string;
}

function normalizeComment(raw: Record<string, unknown>): Comment {
  return pickDto<Comment>(raw, {
    id: ['id', 'Id', 'commentId', 'CommentId'],
    content: ['content', 'Content'],
    issueId: ['issueId', 'IssueId'],
    authorName: ['authorName', 'AuthorName', 'userName', 'UserName'],
    createdAt: ['createdAt', 'CreatedAt'],
  });
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly base = `${API_BASE_URL}/api/Comments`;

  constructor(private readonly http: HttpClient) {}

  getByIssue(issueId: string, query: PaginationQuery): Observable<PagedResult<Comment>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/issue/${issueId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeComment)
            : normalizeArray(body, normalizeComment),
        };
      }),
    );
  }

  create(payload: CreateCommentPayload): Observable<Comment> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeComment));
  }
}
