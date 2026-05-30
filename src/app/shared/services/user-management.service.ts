import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';
import { AuthUser, UserResponseDto } from './auth.models';
import { RegisterUserDto, UpdateUserDto } from './user-management.models';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly apiUrl = `${API_BASE_URL}/api/User`;

  constructor(private readonly http: HttpClient) {}

  getUsersPaged(query: PaginationQuery): Observable<PagedResult<AuthUser>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.apiUrl}/getAll`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<UserResponseDto>(body, page, limit);
        return {
          ...parsed,
          items: parsed.items.map((user) => this.normalizeUser(user)),
        };
      }),
    );
  }

  getAllUsers(): Observable<AuthUser[]> {
    return this.getUsersPaged({ page: 1, limit: 10 }).pipe(map((result) => result.items));
  }

  createUser(user: RegisterUserDto): Observable<AuthUser> {
    return this.http
      .post<{ user?: UserResponseDto } | UserResponseDto>(`${this.apiUrl}/register`, user)
      .pipe(map((response) => this.normalizeUser(this.unwrapUserResponse(response))));
  }

  updateUser(user: UpdateUserDto): Observable<AuthUser> {
    return this.http
      .put<UserResponseDto>(`${this.apiUrl}/${user.UserId}`, user)
      .pipe(map((response) => this.normalizeUser(response)));
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

  private unwrapUserResponse(response: { user?: UserResponseDto } | UserResponseDto): UserResponseDto {
    if ('user' in response) {
      return response.user ?? {};
    }

    return response as any;
  }
}
