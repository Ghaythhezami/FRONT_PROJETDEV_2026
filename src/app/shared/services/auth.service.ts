import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  AuthTokens,
  AuthUser,
  LoginRequestDto,
  TokenApiDto,
  UserResponseDto,
} from './auth.models';
import { BoardSignalrService } from './board-signalr.service';
import { NotificationService } from './notification.service';

const ACCESS_TOKEN_KEY = 'agile_ai_access_token';
const REFRESH_TOKEN_KEY = 'agile_ai_refresh_token';
const USER_KEY = 'agile_ai_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${API_BASE_URL}/api/User`;
  private readonly currentUserSignal = signal<AuthUser | null>(this.readUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessToken);

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
    private readonly boardSignalrService: BoardSignalrService,
  ) {}

  get accessToken(): string | null {
    return this.readStorage(ACCESS_TOKEN_KEY);
  }

  login(email: string, password: string, rememberMe: boolean): Observable<AuthUser> {
    const request: LoginRequestDto = {
      Email: email,
      MotDePasse: password,
    };

    return this.http.post<TokenApiDto>(`${this.apiUrl}/authenticate`, request).pipe(
      map((tokens) => this.normalizeTokens(tokens)),
      tap((tokens) => this.storeTokens(tokens, rememberMe)),
      switchMap(() => this.getUserDetails(email)),
      tap((user) => this.storeUser(user, rememberMe)),
      tap(() => {
        this.notificationService.loadMine().subscribe();
        this.boardSignalrService.start();
      }),
    );
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
    this.notificationService.clear();
    this.boardSignalrService.stop();
  }

  private normalizeTokens(tokens: TokenApiDto): AuthTokens {
    const accessToken = tokens.AccessToken ?? tokens.accessToken ?? '';
    const refreshToken = tokens.RefreshToken ?? tokens.refreshToken ?? '';

    if (!accessToken || !refreshToken) {
      throw new Error('The login response did not include the expected tokens.');
    }

    return { accessToken, refreshToken };
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

  private storeTokens(tokens: AuthTokens, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    this.clearAuthStorage();
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
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
  }
}
