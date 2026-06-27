import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FeedbackType, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[99999] flex max-w-sm flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          role="alert"
          class="animate-in rounded-xl border px-4 py-3 text-sm shadow-theme-lg"
          [ngClass]="typeClasses(toast.type)"
        >
          <div class="flex items-start justify-between gap-3">
            <p>{{ toast.message }}</p>
            <button
              type="button"
              class="shrink-0 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
              (click)="toastService.dismiss(toast.id)"
            >
              ✕
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  typeClasses(type: FeedbackType): string {
    const map: Record<FeedbackType, string> = {
      error: 'border-error-200 bg-error-50 text-error-800',
      success: 'border-success-200 bg-success-50 text-success-800',
      info: 'border-gray-200 bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      warning: 'border-warning-200 bg-warning-50 text-warning-800',
    };
    return map[type];
  }
}
