import { signal, computed } from '@angular/core';
import { Observable, tap, catchError, of, finalize } from 'rxjs';
import {
  DEFAULT_PAGE_LIMIT,
  PagedResult,
  PaginationQuery,
} from '../models/pagination.models';

export type PaginatedFetchFn<T> = (
  query: PaginationQuery,
) => Observable<PagedResult<T>>;

/**
 * Reusable state for infinite-scroll lists and paginated tables (limit 10 by default).
 */
export class PaginatedListStore<T> {
  private readonly itemsSignal = signal<T[]>([]);
  private readonly pageSignal = signal(1);
  private readonly totalSignal = signal(0);
  private readonly hasMoreSignal = signal(false);
  private readonly loadingSignal = signal(false);
  private readonly loadingMoreSignal = signal(false);
  private readonly errorSignal = signal('');
  private readonly searchSignal = signal('');
  private readonly filtersSignal = signal<Record<string, string | number | boolean>>({});

  readonly items = this.itemsSignal.asReadonly();
  readonly page = this.pageSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly hasMore = this.hasMoreSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loadingMore = this.loadingMoreSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly search = this.searchSignal.asReadonly();
  readonly isEmpty = computed(() => !this.loadingSignal() && this.itemsSignal().length === 0);

  constructor(
    private readonly fetchFn: PaginatedFetchFn<T>,
    private readonly defaultLimit = DEFAULT_PAGE_LIMIT,
  ) {}

  get currentQuery(): PaginationQuery {
    return {
      page: this.pageSignal(),
      limit: this.defaultLimit,
      search: this.searchSignal(),
      filters: this.filtersSignal(),
    };
  }

  loadFirst(search?: string, filters?: Record<string, string | number | boolean>): void {
    if (search !== undefined) {
      this.searchSignal.set(search);
    }
    if (filters !== undefined) {
      this.filtersSignal.set(filters);
    }
    this.pageSignal.set(1);
    this.itemsSignal.set([]);
    this.fetchPage(true);
  }

  loadMore(): void {
    if (!this.hasMoreSignal() || this.loadingSignal() || this.loadingMoreSignal()) {
      return;
    }
    this.pageSignal.update((p) => p + 1);
    this.fetchPage(false);
  }

  setSearch(search: string): void {
    this.loadFirst(search);
  }

  setFilters(filters: Record<string, string | number | boolean>): void {
    this.loadFirst(undefined, filters);
  }

  /** Replace current page (for table pagination — does not append). */
  goToPage(page: number): void {
    if (page < 1 || this.loadingSignal()) {
      return;
    }
    this.pageSignal.set(page);
    this.fetchPage(true);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalSignal() / this.defaultLimit));
  }

  get pageLimit(): number {
    return this.defaultLimit;
  }

  reset(): void {
    this.itemsSignal.set([]);
    this.pageSignal.set(1);
    this.totalSignal.set(0);
    this.hasMoreSignal.set(false);
    this.errorSignal.set('');
    this.searchSignal.set('');
    this.filtersSignal.set({});
  }

  private fetchPage(replace: boolean): void {
    const query = this.currentQuery;

    if (replace) {
      this.loadingSignal.set(true);
    } else {
      this.loadingMoreSignal.set(true);
    }
    this.errorSignal.set('');

    this.fetchFn(query)
      .pipe(
        tap((result) => {
          this.itemsSignal.update((current) =>
            replace ? result.items : [...current, ...result.items],
          );
          this.totalSignal.set(result.total);
          this.hasMoreSignal.set(result.hasMore);
        }),
        catchError((error) => {
          this.errorSignal.set(
            error?.error?.message ?? error?.message ?? 'Unable to load data.',
          );
          if (!replace) {
            this.pageSignal.update((p) => Math.max(1, p - 1));
          }
          return of({
            items: [] as T[],
            page: query.page ?? 1,
            limit: query.limit ?? this.defaultLimit,
            total: 0,
            hasMore: false,
          });
        }),
        finalize(() => {
          this.loadingSignal.set(false);
          this.loadingMoreSignal.set(false);
        }),
      )
      .subscribe();
  }
}
