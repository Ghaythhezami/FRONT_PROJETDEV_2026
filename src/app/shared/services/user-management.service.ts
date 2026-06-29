import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { AuthUser, UserResponseDto } from './auth.models';
import { RegisterUserDto, UpdateUserDto } from './user-management.models';
import { fetchServerPagedList } from '../utils/list-api.util';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly apiUrl = `${API_BASE_URL}/api/User`;

  constructor(private readonly http: HttpClient) {}

  getUsersPaged(query: PaginationQuery): Observable<PagedResult<AuthUser>> {
    return fetchServerPagedList(
      this.http,
      `${this.apiUrl}/getAll`,
      query,
      (raw) => this.normalizeUser(raw as UserResponseDto),
    ).pipe(
      catchError((error) => {
        if (error?.status === 403) {
          return throwError(
            () =>
              new Error(
                'Access denied: only administrators can list all users. Sign in as admin or add members by user ID.',
              ),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  getAllUsers(): Observable<AuthUser[]> {
    return this.getUsersPaged({ page: 1, limit: 10 }).pipe(map((result) => result.items));
  }

  createUser(user: RegisterUserDto): Observable<AuthUser> {
    return this.http
      .post<{ user?: UserResponseDto; User?: UserResponseDto } | UserResponseDto>(
        `${this.apiUrl}/register`,
        user,
      )
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

  private unwrapUserResponse(
    response: { user?: UserResponseDto; User?: UserResponseDto } | UserResponseDto,
  ): UserResponseDto {
    if (response && typeof response === 'object' && ('user' in response || 'User' in response)) {
      return (response as { user?: UserResponseDto; User?: UserResponseDto }).user ??
        (response as { User?: UserResponseDto }).User ??
        {};
    }
    return response as UserResponseDto;
  }
}
