import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-load-more-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-3 py-6">
      @if (loading) {
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span
            class="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
          ></span>
          Loading…
        </div>
      } @else if (hasMore) {
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          (click)="loadMore.emit()"
        >
          Load more
        </button>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Showing {{ shown }} of {{ total }}
        </p>
      } @else if (shown > 0) {
        <p class="text-xs text-gray-400 dark:text-gray-500">All {{ shown }} items loaded</p>
      }
    </div>
  `,
})
export class LoadMoreFooterComponent {
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() shown = 0;
  @Input() total = 0;

  @Output() loadMore = new EventEmitter<void>();
}
