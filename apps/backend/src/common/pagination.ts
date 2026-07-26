export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface Paginated<T> {
  readonly data: readonly T[];
  readonly pagination: Pagination;
}

export function buildPagination(
  page: number,
  pageSize: number,
  total: number,
): Pagination {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function paginated<T>(
  data: readonly T[],
  page: number,
  pageSize: number,
  total: number,
): Paginated<T> {
  return { data, pagination: buildPagination(page, pageSize, total) };
}
