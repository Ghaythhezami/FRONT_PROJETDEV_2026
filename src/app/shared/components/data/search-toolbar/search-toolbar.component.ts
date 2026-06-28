import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <span
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </span>
        <input
          type="search"
          class="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-10 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          [placeholder]="placeholder"
          [(ngModel)]="searchValue"
          (ngModelChange)="onSearchChange($event)"
        />
      </div>
      <div class="flex items-center gap-2">
        @if (total !== null) {
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ total }} {{ totalLabel }}
          </span>
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class SearchToolbarComponent {
  @Input() placeholder = 'Search…';
  @Input() total: number | null = null;
  @Input() totalLabel = 'results';
  @Input() debounceMs = 1000;

  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  private debounceTimer?: ReturnType<typeof setTimeout>;

  onSearchChange(value: string): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.searchChange.emit(value), this.debounceMs);
  }
}
