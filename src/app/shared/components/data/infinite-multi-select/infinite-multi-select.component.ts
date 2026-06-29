import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InfiniteScrollDirective } from '../../../directives/infinite-scroll.directive';
import { SelectOption } from '../infinite-select/infinite-select.component';

@Component({
  selector: 'app-infinite-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule, InfiniteScrollDirective],
  template: `
    <div class="relative" #container>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
      </label>
      <button
        type="button"
        class="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-left text-sm dark:border-gray-700 dark:bg-gray-900"
        (click)="toggle()"
      >
        @for (chip of selectedOptions; track chip.value) {
          <span class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {{ chip.label }}
            <button type="button" class="hover:text-brand-900" (click)="remove(chip.value, $event)">×</button>
          </span>
        } @empty {
          <span class="text-gray-400">{{ placeholder }}</span>
        }
      </button>

      @if (isOpen) {
        <div class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              type="search"
              class="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder="Search…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
            />
          </div>
          <ul class="max-h-56 overflow-y-auto py-1">
            @for (option of options; track option.value) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  (click)="toggleOption(option)"
                >
                  <span
                    class="flex h-4 w-4 items-center justify-center rounded border"
                    [class.border-brand-500]="isSelected(option.value)"
                    [class.bg-brand-500]="isSelected(option.value)"
                  >
                    @if (isSelected(option.value)) {
                      <svg class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    }
                  </span>
                  <span>{{ option.label }}</span>
                </button>
              </li>
            }
            <li appInfiniteScroll class="h-2" [appInfiniteScrollDisabled]="!hasMore || loading" (appInfiniteScroll)="loadMore.emit()"></li>
          </ul>
        </div>
      }
    </div>
  `,
})
export class InfiniteMultiSelectComponent {
  private readonly host = inject(ElementRef);

  @Input() label = 'Select';
  @Input() placeholder = 'Choose options';
  @Input() values: string[] = [];
  @Input() options: SelectOption[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() max = 10;
  @Input() debounceMs = 400;

  @Output() valuesChange = new EventEmitter<string[]>();
  @Output() search = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();

  isOpen = false;
  searchTerm = '';
  private debounceTimer?: ReturnType<typeof setTimeout>;

  get selectedOptions(): SelectOption[] {
    return this.options.filter((o) => this.values.includes(o.value));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  onSearch(term: string): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search.emit(term), this.debounceMs);
  }

  isSelected(value: string): boolean {
    return this.values.includes(value);
  }

  toggleOption(option: SelectOption): void {
    const next = this.isSelected(option.value)
      ? this.values.filter((v) => v !== option.value)
      : [...this.values, option.value].slice(0, this.max);
    this.valuesChange.emit(next);
  }

  remove(value: string, event: Event): void {
    event.stopPropagation();
    this.valuesChange.emit(this.values.filter((v) => v !== value));
  }
}
