import { config } from '@/services/config';
import {
  ApiError,
  API_ERROR_CODES,
  type ApiErrorCode,
} from '@/types/api.types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly timeout?: number;
  readonly cache?: RequestCache;
}

const isServer = typeof window === 'undefined';

async function buildServerHeaders(): Promise<Record<string, string>> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader ? { cookie: cookieHeader } : {};
}

function statusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return API_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return API_ERROR_CODES.FORBIDDEN;
    case 404:
      return API_ERROR_CODES.NOT_FOUND;
    case 422:
      return API_ERROR_CODES.VALIDATION;
    default:
      return status >= 500
        ? API_ERROR_CODES.SERVER
        : API_ERROR_CODES.UNKNOWN;
  }
}

interface ErrorResponseShape {
  readonly message?: unknown;
  readonly details?: unknown;
}

function extractErrorDetails(
  value: unknown,
): Record<string, readonly string[]> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const result: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Array.isArray(raw)) {
      result[key] = raw.map((item) => String(item));
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

async function buildApiErrorFromResponse(
  response: Response,
): Promise<ApiError> {
  let payload: ErrorResponseShape = {};
  try {
    payload = (await response.json()) as ErrorResponseShape;
  } catch {
    payload = {};
  }
  const message =
    typeof payload.message === 'string'
      ? payload.message
      : response.statusText || 'Erro na requisição';

  return new ApiError({
    code: statusToErrorCode(response.status),
    message,
    status: response.status,
    details: extractErrorDetails(payload.details),
  });
}

function combineSignals(
  timeoutSignal: AbortSignal,
  external?: AbortSignal,
): AbortSignal {
  if (!external) {
    return timeoutSignal;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeoutSignal, external]);
  }
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  timeoutSignal.addEventListener('abort', abort, { once: true });
  external.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    timeout = config.timeout,
    cache,
  } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
  const effectiveSignal = combineSignals(timeoutController.signal, signal);

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (isServer) {
    Object.assign(baseHeaders, await buildServerHeaders());
  }

  const url = `${config.apiBaseUrl}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: baseHeaders,
      credentials: 'include',
      signal: effectiveSignal,
      cache,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await buildApiErrorFromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      const aborted = signal?.aborted ?? false;
      throw new ApiError({
        code: aborted
          ? API_ERROR_CODES.UNKNOWN
          : API_ERROR_CODES.TIMEOUT,
        message: aborted
          ? 'Requisição cancelada'
          : 'A requisição excedeu o tempo limite',
        status: 0,
      });
    }
    throw new ApiError({
      code: API_ERROR_CODES.NETWORK,
      message: 'Falha de conexão com o servidor',
      status: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const httpClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'DELETE' }),
} as const;

export type HttpClient = typeof httpClient;