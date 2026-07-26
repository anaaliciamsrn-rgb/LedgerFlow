import type { Pagination } from '@/types/common.types';

export interface ApiResponse<T> {
  readonly data: T;
  readonly message?: string;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly pagination: Pagination;
}

export const API_ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorPayload {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly status: number;
  readonly details?: Readonly<Record<string, readonly string[]>>;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Readonly<Record<string, readonly string[]>>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isAuthError(): boolean {
    return (
      this.code === API_ERROR_CODES.UNAUTHORIZED ||
      this.code === API_ERROR_CODES.FORBIDDEN
    );
  }
}