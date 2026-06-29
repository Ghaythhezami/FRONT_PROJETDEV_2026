import { Injectable, signal } from '@angular/core';

export type FeedbackType = 'error' | 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: FeedbackType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<ToastItem[]>([]);
  private nextId = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, type: FeedbackType = 'info', durationMs = 5000): void {
    const id = `toast-${++this.nextId}`;
    const item: ToastItem = { id, message, type };
    this.toastsSignal.update((list) => [...list, item]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 7000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  dismiss(id: string): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toastsSignal.set([]);
  }
}
