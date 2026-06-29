import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { NotificationResponseDto } from './notification.models';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush, { optional: true });
  private permissionRequested = false;
  private subscribed = false;

  /** Call after login — prompts once for OS notification permission + Web Push subscription. */
  async ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      await this.registerWebPush();
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    if (this.permissionRequested) {
      return Notification.permission;
    }
    this.permissionRequested = true;
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await this.registerWebPush();
      }
      return result;
    } catch {
      return Notification.permission;
    }
  }

  /** Show a native OS notification when SignalR delivers while the app is open. */
  async showFromSignal(notification: NotificationResponseDto): Promise<void> {
    if (typeof window === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const title = 'Agile Ai';
    const body = notification.Message ?? notification.message ?? 'New update';
    const icon = '/icons/icon-192x192.png';
    const badge = '/icons/icon-128x128.png';
    const tag = notification.NotificationId ?? notification.notificationId ?? `agile-${Date.now()}`;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          data: { link: notification.Link ?? notification.link ?? '/' },
        });
        return;
      }
      new Notification(title, { body, icon, tag });
    } catch {
      // Fallback silently — in-app bell still works
    }
  }

  private async registerWebPush(): Promise<void> {
    if (this.subscribed || !this.swPush?.isEnabled) {
      return;
    }

    try {
      const { PublicKey, publicKey } = await firstValueFrom(
        this.http.get<{ PublicKey?: string; publicKey?: string }>(
          `${API_BASE_URL}/api/Notifications/vapid-public-key`,
        ),
      );
      const vapidKey = PublicKey ?? publicKey;
      if (!vapidKey) {
        return;
      }

      let subscription = await firstValueFrom(this.swPush.subscription);
      if (!subscription) {
        subscription = await this.swPush.requestSubscription({ serverPublicKey: vapidKey });
      }

      if (!subscription) {
        return;
      }

      const json = subscription.toJSON();
      const keys = json.keys ?? {};
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/api/Notifications/push-subscribe`, {
          Endpoint: json.endpoint,
          P256dh: keys['p256dh'],
          Auth: keys['auth'],
        }),
      );
      this.subscribed = true;
    } catch {
      // Permission denied or SW unavailable — in-app notifications still work
    }
  }
}
