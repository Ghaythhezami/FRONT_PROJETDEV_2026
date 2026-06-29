import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-ui-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
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
      <input
        [type]="type"
        class="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        [class.border-error-400]="error"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [attr.maxlength]="maxLength"
        [attr.min]="min"
        [attr.max]="max"
        [ngModel]="value"
        (ngModelChange)="onChange($event)"
        (blur)="onTouched()"
      />
      @if (hint && !error) {
        <p class="text-xs text-gray-500">{{ hint }}</p>
      }
      @if (error) {
        <p class="text-xs text-error-600">{{ error }}</p>
      }
    </div>
  `,
})
export class FormFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() hint = '';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() maxLength?: number;
  @Input() min?: number;
  @Input() max?: number;

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
