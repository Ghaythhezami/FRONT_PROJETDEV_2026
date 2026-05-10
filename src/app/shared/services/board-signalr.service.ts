import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../config/api.config';
import { NotificationResponseDto } from './notification.models';
import { NotificationService } from './notification.service';

const ACCESS_TOKEN_KEY = 'agile_ai_access_token';

@Injectable({ providedIn: 'root' })
export class BoardSignalrService {
  private connection: signalR.HubConnection | null = null;
  private isStarting = false;
  private notificationHandlerRegistered = false;

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async start(): Promise<void> {
    if (!this.accessToken || this.isStarting) {
      return;
    }

    const connection = this.getConnection();

    if (
      connection.state === signalR.HubConnectionState.Connected ||
      connection.state === signalR.HubConnectionState.Connecting
    ) {
      return;
    }

    this.isStarting = true;

    try {
      await connection.start();
    } catch (error) {
      console.error('SignalR connection failed.', error);
    } finally {
      this.isStarting = false;
    }
  }

  async stop(): Promise<void> {
    const connection = this.connection;
    this.notificationHandlerRegistered = false;
    this.connection = null;

    if (
      connection &&
      connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      await connection.stop();
    }
  }

  private getConnection(): signalR.HubConnection {
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/board`, {
          accessTokenFactory: () => this.accessToken ?? '',
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();
    }

    this.registerNotificationHandler(this.connection);
    return this.connection;
  }

  private registerNotificationHandler(connection: signalR.HubConnection): void {
    if (this.notificationHandlerRegistered) {
      return;
    }

    connection.on('NotificationReceived', (notification: NotificationResponseDto) => {
      this.notificationService.upsert(notification);
    });

    connection.onreconnected(() => {
      console.info('SignalR reconnected. Notification group is restored by the backend.');
    });

    this.notificationHandlerRegistered = true;
  }

  private get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
