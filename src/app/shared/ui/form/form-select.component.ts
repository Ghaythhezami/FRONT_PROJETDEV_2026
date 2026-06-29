import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-ui-form-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="space-y-1.5">
      @if (label) {
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ label }}
          @if (required) { <span class="text-error-500">*</span> }
        </label>
      }
      <select
        class="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        [class.border-error-400]="error"
        [disabled]="disabled"
        [ngModel]="value"
        (ngModelChange)="onChange($event)"
        (blur)="onTouched()"
      >
        @if (placeholder) {
          <option value="">{{ placeholder }}</option>
        }
        @for (opt of options; track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      @if (error) {
        <p class="text-xs text-error-600">{{ error }}</p>
      }
    </div>
  `,
})
export class FormSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() options: SelectOption[] = [];
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;

  value = '';

  private onValueChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onChange(value: string): void {
    this.value = value;
    this.onValueChange(value);
  }
}
