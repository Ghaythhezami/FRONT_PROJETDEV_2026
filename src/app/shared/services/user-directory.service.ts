import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { AuthUser, UserResponseDto } from './auth.models';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { UserManagementService } from './user-management.service';
import { fetchClientPagedList } from '../utils/list-api.util';

/**
 * Role-aware user search.
 * - Admin: GET /api/User/getAll
 * - Others: GET /api/User (admin-only list — returns empty on 403)
 */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly userManagement = inject(UserManagementService);
  private readonly apiUrl = `${API_BASE_URL}/api/User`;

  searchUsers(query: PaginationQuery): Observable<PagedResult<AuthUser>> {
    if (this.auth.isAdmin()) {
      return this.userManagement.getUsersPaged(query);
    }
    return this.searchDirectoryUsers(query);
  }

  private searchDirectoryUsers(query: PaginationQuery): Observable<PagedResult<AuthUser>> {
    return fetchClientPagedList(
      this.http,
      this.apiUrl,
      query,
      (raw) => this.normalizeUser(raw as UserResponseDto),
      (user, term) =>
        `${user.prenom} ${user.nom} ${user.email}`.toLowerCase().includes(term),
    ).pipe(
      catchError((error) => {
        if (error?.status === 403 || error?.status === 404) {
          const page = query.page ?? 1;
          const limit = query.limit ?? 10;
          return of({ items: [], page, limit, total: 0, hasMore: false });
        }
        return throwError(() => error);
      }),
    );
  }

  private normalizeUser(user: UserResponseDto): AuthUser {
    return {
      userId: user.UserId ?? user.userId ?? '',
      nom: user.Nom ?? user.nom ?? '',
      prenom: user.Prenom ?? user.prenom ?? '',
      email: user.Email ?? user.email ?? '',
      telephone: user.Telephone ?? user.telephone ?? '',
      role: user.Role ?? user.role ?? '',
      filiale: user.Filiale ?? user.filiale ?? '',
    };
  }
}
