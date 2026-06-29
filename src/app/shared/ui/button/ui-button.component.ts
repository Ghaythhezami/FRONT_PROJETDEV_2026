import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [attr.form]="formId || null"
      [disabled]="disabled || loading"
      class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
      [ngClass]="[sizeClasses, variantClasses, className]"
      (click)="onClick($event)"
    >
      @if (loading) {
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      }
      <ng-content />
    </button>
  `,
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() className = '';
  @Input() formId = '';

  @Output() pressed = new EventEmitter<Event>();

  get sizeClasses(): string {
    const map: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    };
    return map[this.size];
  }

  get variantClasses(): string {
    const map: Record<ButtonVariant, string> = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600',
      secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
      danger: 'bg-error-500 text-white hover:bg-error-600',
      ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
    };
    return map[this.variant];
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.pressed.emit(event);
    }
  }
}
