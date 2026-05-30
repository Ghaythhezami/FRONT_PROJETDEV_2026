/** Default page size — never use bulk fetches like limit=100. */
export const DEFAULT_PAGE_LIMIT = 10;

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | null | undefined>;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export function createPaginationQuery(
  overrides: Partial<PaginationQuery> = {},
): Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery {
  return {
    page: overrides.page ?? 1,
    limit: overrides.limit ?? DEFAULT_PAGE_LIMIT,
    ...overrides,
  };
}
