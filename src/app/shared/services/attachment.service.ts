import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Attachment } from '../models/domain.models';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { normalizeAttachment } from '../utils/domain-normalizers';
import { fetchClientPagedList } from '../utils/list-api.util';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly base = `${API_BASE_URL}/api/Attachments`;

  constructor(private readonly http: HttpClient) {}

  getByIssue(issueId: string, query: PaginationQuery): Observable<PagedResult<Attachment>> {
    return fetchClientPagedList(
      this.http,
      `${this.base}/issue/${issueId}`,
      query,
      (raw) => normalizeAttachment(raw),
      (item, term) => item.fileName.toLowerCase().includes(term),
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
