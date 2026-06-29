import { Injectable, inject } from '@angular/core';
import { FeedbackType, ToastService } from '../ui/toast/toast.service';

/** @deprecated Prefer injecting ToastService directly. Kept for api-error interceptor. */
@Injectable({ providedIn: 'root' })
export class ApiFeedbackService {
  private readonly toast = inject(ToastService);

  show(message: string, type: FeedbackType = 'info'): void {
    this.toast.show(message, type);
  }

  clear(): void {
    this.toast.clear();
  }
}
