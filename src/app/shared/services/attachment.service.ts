import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Attachment } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildPaginationParams, parsePagedResponse, pickDto } from '../utils/api.util';
import { normalizeArray } from '../utils/domain-normalizers';

function normalizeAttachment(raw: Record<string, unknown>): Attachment {
  return pickDto<Attachment>(raw, {
    id: ['id', 'Id', 'attachmentId', 'AttachmentId'],
    fileName: ['fileName', 'FileName', 'name', 'Name'],
    url: ['url', 'Url', 'fileUrl', 'FileUrl'],
    issueId: ['issueId', 'IssueId'],
    uploadedAt: ['uploadedAt', 'UploadedAt', 'createdAt', 'CreatedAt'],
    sizeBytes: ['sizeBytes', 'SizeBytes', 'length', 'Length'],
  });
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly base = `${API_BASE_URL}/api/Attachments`;

  constructor(private readonly http: HttpClient) {}

  getByIssue(issueId: string, query: PaginationQuery): Observable<PagedResult<Attachment>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.base}/issue/${issueId}`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<Record<string, unknown>>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.length
            ? parsed.items.map(normalizeAttachment)
            : normalizeArray(body, normalizeAttachment),
        };
      }),
    );
  }

  upload(issueId: string, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<Record<string, unknown>>(`${this.base}/issue/${issueId}`, formData)
      .pipe(map(normalizeAttachment));
  }
}
