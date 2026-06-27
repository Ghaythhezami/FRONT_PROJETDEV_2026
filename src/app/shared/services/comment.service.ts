import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Comment } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { pickDto } from '../utils/api.util';
import { fetchClientPagedList } from '../utils/list-api.util';

export interface CreateCommentPayload {
  Content: string;
  IssueId: string;
}

function normalizeComment(raw: Record<string, unknown>): Comment {
  return pickDto<Comment>(raw, {
    id: ['commentId', 'CommentId', 'id', 'Id'],
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
    return fetchClientPagedList(
      this.http,
      `${this.base}/issue/${issueId}`,
      query,
      (raw) => normalizeComment(raw),
      (item, term) => item.content.toLowerCase().includes(term),
    );
  }

  create(payload: CreateCommentPayload): Observable<Comment> {
    return this.http
      .post<Record<string, unknown>>(this.base, payload)
      .pipe(map(normalizeComment));
  }
}
