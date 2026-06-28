import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { RegisterUserDto } from './user-management.models';
import {
  AuthTokens,
  AuthUser,
  LoginRequestDto,
  TokenApiDto,
  UserResponseDto,
} from './auth.models';
import { BoardSignalrService } from './board-signalr.service';
import { NotificationService } from './notification.service';
import { isStaffRole } from '../utils/role.util';

const ACCESS_TOKEN_KEY = 'agile_ai_access_token';
const REFRESH_TOKEN_KEY = 'agile_ai_refresh_token';
const USER_KEY = 'agile_ai_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${API_BASE_URL}/api/User`;
  private readonly currentUserSignal = signal<AuthUser | null>(this.readUser());
  /** Tracks login state reactively — storage alone does not update computed signals. */
  private readonly sessionActiveSignal = signal(!!this.readStorage(ACCESS_TOKEN_KEY));

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionActiveSignal());
  readonly isAdmin = computed(() => isStaffRole(this.currentUserSignal()?.role));

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
    private readonly boardSignalrService: BoardSignalrService,
  ) {
    this.repairStoredUserFromToken();
    if (this.sessionActiveSignal()) {
      this.bootstrapRealtimeServices();
    }
  }

  get accessToken(): string | null {
    return this.readStorage(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return this.readStorage(REFRESH_TOKEN_KEY);
  }

  /** Used by route guards — reads live token from storage as well as the session signal. */
  hasValidSession(): boolean {
    return this.sessionActiveSignal() && !!this.readStorage(ACCESS_TOKEN_KEY);
  }

  refreshAccessToken(): Observable<AuthTokens> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const accessToken = this.accessToken ?? '';
    return this.http
      .post<TokenApiDto>(`${this.apiUrl}/refresh`, {
        AccessToken: accessToken,
        RefreshToken: refreshToken,
      })
      .pipe(
        map((tokens) => this.normalizeTokens(tokens)),
        tap((tokens) => {
          const storage = localStorage.getItem(ACCESS_TOKEN_KEY) ? localStorage : sessionStorage;
          storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
          storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          this.sessionActiveSignal.set(true);
        }),
      );
  }

  getUsers(query?: { page?: number; limit?: number }): Observable<AuthUser[]> {
    const params: Record<string, string> = {};
    if (query?.page) {
      params['page'] = String(query.page);
    }
    if (query?.limit) {
      params['limit'] = String(query.limit ?? 10);
    }
    return this.http
      .get<UserResponseDto[]>(this.apiUrl, { params })
      .pipe(map((users) => users.map((u) => this.normalizeUser(u))));
  }

  register(user: RegisterUserDto): Observable<AuthUser> {
    return this.http
      .post<{ user?: UserResponseDto } | UserResponseDto>(`${this.apiUrl}/register`, user)
      .pipe(
        map((response) => {
          const record = response as Record<string, unknown>;
          const dto =
            record && typeof record === 'object' && ('user' in record || 'User' in record)
              ? ((record['user'] ?? record['User']) as UserResponseDto)
              : (response as UserResponseDto);
          return this.normalizeUser(dto ?? {});
        }),
      );
  }

  login(email: string, password: string, rememberMe: boolean): Observable<AuthUser> {
    const request: LoginRequestDto = {
      Email: email,
      MotDePasse: password,
    };

    return this.http.post<TokenApiDto>(`${this.apiUrl}/authenticate`, request).pipe(
      map((tokens) => this.normalizeTokens(tokens)),
      tap((tokens) => this.storeTokens(tokens, rememberMe)),
      switchMap(() =>
        this.getUserDetails(email).pipe(
          catchError(() => of(this.fallbackUser(email))),
        ),
      ),
      map((user) => this.ensureUserId(user)),
      tap((user) => this.storeUser(user, rememberMe)),
    );
  }

  /** Load notifications and SignalR after navigation — avoids blocking login redirect. */
  bootstrapRealtimeServices(): void {
    this.notificationService.loadMine().subscribe({ error: () => undefined });
    void this.boardSignalrService.start();
  }

  getUserDetails(email: string): Observable<AuthUser> {
    return this.http
      .get<UserResponseDto>(`${this.apiUrl}/details`, { params: { email } })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  logout(): void {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(USER_KEY);
    });
    this.currentUserSignal.set(null);
    this.sessionActiveSignal.set(false);
    this.notificationService.clear();
    this.boardSignalrService.stop();
  }

  private fallbackUser(email: string): AuthUser {
    return this.ensureUserId({
      userId: '',
      nom: '',
      prenom: email.split('@')[0] ?? 'User',
      email,
      telephone: '',
      role: '',
      filiale: '',
    });
  }

  private ensureUserId(user: AuthUser): AuthUser {
    if (user.userId?.trim()) {
      return user;
    }
    const fromToken = this.userIdFromAccessToken();
    return fromToken ? { ...user, userId: fromToken } : user;
  }

  private userIdFromAccessToken(): string {
    const token = this.accessToken;
    if (!token) {
      return '';
    }
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return '';
      }
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized)) as Record<string, unknown>;
      return String(decoded['UserId'] ?? decoded['userId'] ?? '').trim();
    } catch {
      return '';
    }
  }

  private repairStoredUserFromToken(): void {
    const user = this.currentUserSignal();
    if (!user || user.userId?.trim()) {
      return;
    }
    const repaired = this.ensureUserId(user);
    if (repaired.userId && repaired.userId !== user.userId) {
      const storage = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage;
      storage.setItem(USER_KEY, JSON.stringify(repaired));
      this.currentUserSignal.set(repaired);
    }
  }

  private normalizeTokens(tokens: TokenApiDto): AuthTokens {
    const accessToken = tokens.AccessToken ?? tokens.accessToken ?? '';
    const refreshToken = tokens.RefreshToken ?? tokens.refreshToken ?? '';

    if (!accessToken || !refreshToken) {
      throw new Error('The login response did not include the expected tokens.');
    }

    return { accessToken, refreshToken };
  }

  uploadProfilePhoto(file: File): Observable<AuthUser> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UserResponseDto>(`${this.apiUrl}/profile-photo`, formData).pipe(
      map((dto) => this.normalizeUser(dto)),
      tap((user) => this.updateStoredUser(user)),
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
      photoUrl: user.PhotoUrl ?? user.photoUrl ?? '',
    };
  }

  updateStoredUser(user: AuthUser): void {
    const storage = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private storeTokens(tokens: AuthTokens, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    this.clearAuthStorage();
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.sessionActiveSignal.set(true);
  }

  private storeUser(user: AuthUser, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private readUser(): AuthUser | null {
    const rawUser = this.readStorage(USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      this.clearAuthStorage();
      return null;
    }
  }

  private readStorage(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private clearAuthStorage(): void {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(USER_KEY);
    });
    this.sessionActiveSignal.set(false);
  }
}
