export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  readonly field: string;
  readonly direction: SortDirection;
}

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface QueryParams extends PaginationParams {
  readonly search?: string;
  readonly sort?: Sort;
}