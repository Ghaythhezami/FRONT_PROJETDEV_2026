import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PagedResult, PaginationQuery } from '../models/pagination.models';
import { buildPaginationParams, parsePagedResponse } from '../utils/api.util';
import { NotificationResponse, NotificationResponseDto } from './notification.models';

export interface SendNotificationPayload {
  ReceiverId: string;
  Description?: string;
  Link?: string;
}

export interface TestNotificationPayload {
  ReceiverId: string;
  Description?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${API_BASE_URL}/api/Notifications`;
  private readonly notificationsSignal = signal<NotificationResponse[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal('');

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly unreadCount = computed(
    () => this.notificationsSignal().filter((notification) => !notification.isRead).length,
  );

  constructor(private readonly http: HttpClient) {}

  loadMine(query: PaginationQuery = { page: 1, limit: 10 }): Observable<NotificationResponse[]> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set('');

    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.apiUrl}/mine`, { params }).pipe(
      map((body) => {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const parsed = parsePagedResponse<NotificationResponseDto>(body, page, limit);
        const list = Array.isArray(body)
          ? (body as NotificationResponseDto[])
          : parsed.items;
        return list.map((n) => this.normalize(n));
      }),
      tap((notifications) => {
        this.notificationsSignal.set(this.sortNotifications(this.dedupe(notifications)));
        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(
          error?.error?.message ?? error?.message ?? 'Unable to load notifications.',
        );
        this.isLoadingSignal.set(false);
        return of([]);
      }),
    );
  }

  getMinePaged(query: PaginationQuery): Observable<PagedResult<NotificationResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const params = buildPaginationParams(query);

    return this.http.get<unknown>(`${this.apiUrl}/mine`, { params }).pipe(
      map((body) => {
        const parsed = parsePagedResponse<NotificationResponseDto>(body, page, limit);
        const items = (Array.isArray(body) ? (body as NotificationResponseDto[]) : parsed.items).map(
          (n) => this.normalize(n),
        );
        return { ...parsed, items };
      }),
    );
  }

  send(payload: SendNotificationPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Send`, payload);
  }

  sendTest(payload: TestNotificationPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/TTest`, payload);
  }

  markAsRead(notificationId: string): Observable<void> {
    this.markLocalRead(notificationId);

    return this.http.patch<void>(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      catchError((error) => {
        this.errorSignal.set(
          error?.error?.message ?? error?.message ?? 'Unable to mark notification as read.',
        );
        return of(void 0);
      }),
    );
  }

  upsert(notificationDto: NotificationResponseDto): void {
    const notification = this.normalize(notificationDto);
    const notifications = this.notificationsSignal();
    const index = notifications.findIndex(
      (item) => item.notificationId === notification.notificationId,
    );

    const nextNotifications =
      index >= 0
        ? notifications.map((item, itemIndex) => (itemIndex === index ? notification : item))
        : [notification, ...notifications];

    this.notificationsSignal.set(this.sortNotifications(nextNotifications));
  }

  clear(): void {
    this.notificationsSignal.set([]);
    this.isLoadingSignal.set(false);
    this.errorSignal.set('');
  }

  private markLocalRead(notificationId: string): void {
    this.notificationsSignal.set(
      this.notificationsSignal().map((notification) =>
        notification.notificationId === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  }

  private normalize(notification: NotificationResponseDto): NotificationResponse {
    return {
      notificationId: notification.NotificationId ?? notification.notificationId ?? '',
      message: notification.Message ?? notification.message ?? '',
      link: notification.Link ?? notification.link ?? '',
      isRead: notification.IsRead ?? notification.isRead ?? false,
      createdAt: notification.CreatedAt ?? notification.createdAt ?? new Date().toISOString(),
      receiverId: notification.ReceiverId ?? notification.receiverId ?? null,
    };
  }

  private dedupe(notifications: NotificationResponse[]): NotificationResponse[] {
    return Array.from(
      new Map(
        notifications
          .filter((notification) => notification.notificationId)
          .map((notification) => [notification.notificationId, notification]),
      ).values(),
    );
  }

  private sortNotifications(notifications: NotificationResponse[]): NotificationResponse[] {
    return [...notifications].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );
  }
}
