import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-ui-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      role="alert"
      class="rounded-lg border px-4 py-3 text-sm"
      [ngClass]="variantClasses"
    >
      <div class="flex items-start justify-between gap-3">
        <p>{{ message }}</p>
        @if (dismissible) {
          <button
            type="button"
            class="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
            (click)="dismissed.emit()"
          >
            ✕
          </button>
        }
      </div>
    </div>
  `,
})
export class AppAlertComponent {
  @Input() message = '';
  @Input() variant: AlertVariant = 'info';
  @Input() dismissible = false;

  @Output() dismissed = new EventEmitter<void>();

  get variantClasses(): string {
    const map: Record<AlertVariant, string> = {
      info: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
      success: 'border-success-200 bg-success-50 text-success-800',
      warning: 'border-warning-200 bg-warning-50 text-warning-800',
      error: 'border-error-200 bg-error-50 text-error-600',
    };
    return map[this.variant];
  }
}
