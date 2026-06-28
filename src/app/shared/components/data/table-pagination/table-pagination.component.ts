import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }} {{ label }}
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          [disabled]="page <= 1 || loading"
          (click)="go(page - 1)"
        >
          Previous
        </button>
        @for (p of pages(); track p) {
          <button
            type="button"
            class="min-w-[2.25rem] rounded-lg px-2 py-1.5 text-sm font-medium"
            [class.bg-brand-500]="p === page"
            [class.text-white]="p === page"
            [class.text-gray-600]="p !== page"
            [class.hover:bg-gray-50]="p !== page"
            [disabled]="loading"
            (click)="go(p)"
          >
            {{ p }}
          </button>
        }
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          [disabled]="page >= totalPages || loading"
          (click)="go(page + 1)"
        >
          Next
        </button>
      </div>
    </div>
  `,
})
export class TablePaginationComponent {
  @Input() page = 1;
  @Input() limit = 5;
  @Input() total = 0;
  @Input() label = 'items';
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / Math.max(1, this.limit)));
  }

  get rangeStart(): number {
    if (!this.total) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  pages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  go(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) {
      return;
    }
    this.pageChange.emit(nextPage);
  }
}
