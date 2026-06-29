import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatedListStore } from '../../../stores/paginated-list.store';
import { InfiniteScrollDirective } from '../../../directives/infinite-scroll.directive';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-infinite-select',
  standalone: true,
  imports: [CommonModule, FormsModule, InfiniteScrollDirective],
  template: `
    <div class="relative" #container>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
        @if (required) {
          <span class="text-error-500">*</span>
        }
      </label>
      <button
        type="button"
        class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        [disabled]="disabled"
        (click)="toggle()"
      >
        <span [class.text-gray-400]="!selectedLabel">{{ selectedLabel || placeholder }}</span>
        <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (isOpen) {
        <div
          class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div class="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              type="search"
              class="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
              placeholder="Search options…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
            />
          </div>
          <ul class="max-h-56 overflow-y-auto py-1" role="listbox">
            @for (option of options; track option.value) {
              <li>
                <button
                  type="button"
                  class="flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  [class.bg-brand-50]="option.value === value"
                  [class.dark:bg-brand-500/10]="option.value === value"
                  (click)="select(option)"
                >
                  <span class="font-medium text-gray-800 dark:text-white/90">{{ option.label }}</span>
                  @if (option.sublabel) {
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ option.sublabel }}</span>
                  }
                </button>
              </li>
            } @empty {
              @if (!loading) {
                <li class="px-4 py-6 text-center text-sm text-gray-500">No options found</li>
              }
            }
            @if (loading) {
              <li class="px-4 py-3 text-center text-sm text-gray-500">Loading…</li>
            }
            <li
              appInfiniteScroll
              class="h-2"
              [appInfiniteScrollDisabled]="!hasMore || loading"
              (appInfiniteScroll)="loadMore.emit()"
            ></li>
          </ul>
        </div>
      }
    </div>
  `,
})
export class InfiniteSelectComponent implements OnInit, OnChanges {
  private readonly host = inject(ElementRef);

  @Input() label = 'Select';
  @Input() placeholder = 'Choose an option';
  @Input() value = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() options: SelectOption[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() debounceMs = 400;

  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();

  isOpen = false;
  searchTerm = '';
  selectedLabel = '';
  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.syncLabel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['options']) {
      this.syncLabel();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  onSearch(term: string): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search.emit(term), this.debounceMs);
  }

  select(option: SelectOption): void {
    this.value = option.value;
    this.selectedLabel = option.label;
    this.valueChange.emit(option.value);
    this.isOpen = false;
  }

  private syncLabel(): void {
    const match = this.options.find((o) => o.value === this.value);
    this.selectedLabel = match?.label ?? '';
  }
}

/** Helper to wire InfiniteSelect with PaginatedListStore */
export function mapStoreToSelectOptions<T>(
  store: PaginatedListStore<T>,
  mapper: (item: T) => SelectOption,
): SelectOption[] {
  return store.items().map(mapper);
}
